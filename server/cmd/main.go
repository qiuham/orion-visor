package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/api"
	"github.com/orion-visor/server/internal/middleware"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	internalssh "github.com/orion-visor/server/internal/ssh"
	"github.com/orion-visor/server/internal/ws"
	"github.com/spf13/viper"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// 加载配置
	cfg := loadConfig()

	// 初始化数据库
	db := initDB(cfg.Database)

	// 初始化 JWT
	middleware.InitJWT(cfg.JWT.Secret, cfg.JWT.Expire)

	// 初始化 Service
	userSvc := service.NewUserService(db)
	hostSvc := service.NewHostService(db)

	// 获取 SSH 配置的辅助函数
	getSSHConfig := func(hostID int64) (*internalssh.ConnectConfig, error) {
		host, err := hostSvc.GetByID(hostID)
		if err != nil {
			return nil, fmt.Errorf("主机不存在: %w", err)
		}
		// 查找主机的认证信息
		var hostCfg model.HostConfig
		if err := db.Where("host_id = ? AND type = ?", hostID, "SSH").First(&hostCfg).Error; err != nil {
			// 使用默认配置
			return &internalssh.ConnectConfig{
				Host:    host.Address,
				Port:    host.Port,
				Timeout: cfg.SSH.ConnectTimeout,
			}, nil
		}
		return &internalssh.ConnectConfig{
			Host:    host.Address,
			Port:    host.Port,
			Timeout: cfg.SSH.ConnectTimeout,
		}, nil
	}

	// 初始化 API
	authAPI := api.NewAuthAPI(userSvc)
	hostAPI := api.NewHostAPI(hostSvc)
	monitorAPI := api.NewMonitorAPI(getSSHConfig, cfg.Monitor.Interval, cfg.Monitor.Retain)

	// 设置路由
	gin.SetMode(cfg.Server.Mode)
	r := gin.Default()

	// CORS
	r.Use(corsMiddleware())

	// 公开接口
	r.POST("/api/auth/login", authAPI.Login)

	// 需要认证的接口
	auth := r.Group("/api", middleware.JWTAuth())
	{
		// 用户
		auth.GET("/user/current", authAPI.GetCurrentUser)

		// 主机管理
		hosts := auth.Group("/host")
		{
			hosts.GET("", hostAPI.List)
			hosts.GET("/:id", hostAPI.Get)
			hosts.POST("", hostAPI.Create)
			hosts.PUT("/:id", hostAPI.Update)
			hosts.DELETE("/:id", hostAPI.Delete)
		}
	}

	// WebSocket 接口（需要 token 参数认证）
	wsGroup := r.Group("/ws", wsTokenAuth())
	{
		wsGroup.GET("/terminal/:hostId", ws.HandleTerminalWS(getSSHConfig))
		wsGroup.GET("/monitor/:hostId", monitorAPI.HandleMonitorWS)
	}

	// 启动服务
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("服务启动: http://localhost%s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("启动失败: %v", err)
	}
}

func loadConfig() *model.Config {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config")
	viper.AddConfigPath(".")
	if err := viper.ReadInConfig(); err != nil {
		log.Fatalf("读取配置失败: %v", err)
	}
	var cfg model.Config
	if err := viper.Unmarshal(&cfg); err != nil {
		log.Fatalf("解析配置失败: %v", err)
	}
	return &cfg
}

func initDB(cfg model.DatabaseConfig) *gorm.DB {
	db, err := gorm.Open(mysql.Open(cfg.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	log.Println("数据库连接成功")
	return db
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

// wsTokenAuth WebSocket 使用 query 参数传递 token
func wsTokenAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Query("token")
		if token == "" {
			c.JSON(401, gin.H{"error": "缺少 token"})
			c.Abort()
			return
		}
		claims, err := middleware.ParseToken(token)
		if err != nil {
			c.JSON(401, gin.H{"error": "无效的 token"})
			c.Abort()
			return
		}
		c.Set("userId", claims.UserID)
		c.Set("username", claims.Username)
		c.Next()
	}
}
