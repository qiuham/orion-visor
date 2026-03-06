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

	// 自动迁移表结构
	autoMigrate(db)

	// 初始化 JWT
	middleware.InitJWT(cfg.JWT.Secret, cfg.JWT.Expire)

	// 初始化权限和审计中间件
	middleware.InitPermission(db)
	middleware.InitAudit(db)

	// 初始化 Service
	userSvc := service.NewUserService(db)
	hostSvc := service.NewHostService(db)
	roleSvc := service.NewRoleService(db)
	identitySvc := service.NewIdentityService(db)
	groupSvc := service.NewHostGroupService(db)
	auditSvc := service.NewAuditService(db)
	sessionSvc := service.NewTerminalSessionService(db)
	systemSvc := service.NewSystemService(db)

	// 获取 SSH 配置的辅助函数（集成凭证管理）
	getSSHConfig := func(hostID int64) (*internalssh.ConnectConfig, error) {
		host, err := hostSvc.GetByID(hostID)
		if err != nil {
			return nil, fmt.Errorf("主机不存在: %w", err)
		}

		sshCfg := &internalssh.ConnectConfig{
			Host:    host.Address,
			Port:    host.Port,
			Timeout: cfg.SSH.ConnectTimeout,
		}

		// 使用主机关联的凭证
		if host.IdentityID > 0 {
			identity, err := identitySvc.GetByID(host.IdentityID)
			if err == nil {
				sshCfg.Username = identity.Username
				sshCfg.Password = identity.Password
				sshCfg.PrivateKey = identity.KeyText
				sshCfg.Passphrase = identity.Passphrase
			}
		}

		return sshCfg, nil
	}

	// 批量执行和定时任务服务
	execSvc := service.NewExecService(db, hostSvc, getSSHConfig)
	cronSvc := service.NewCronService(db, hostSvc, getSSHConfig)

	// 初始化 API
	authAPI := api.NewAuthAPI(userSvc)
	userAPI := api.NewUserAPI(userSvc)
	hostAPI := api.NewHostAPI(hostSvc)
	roleAPI := api.NewRoleAPI(roleSvc)
	identityAPI := api.NewIdentityAPI(identitySvc)
	groupAPI := api.NewHostGroupAPI(groupSvc)
	auditAPI := api.NewAuditAPI(auditSvc)
	monitorAPI := api.NewMonitorAPI(getSSHConfig, cfg.Monitor.Interval, cfg.Monitor.Retain)
	sftpAPI := api.NewSftpAPI(getSSHConfig)
	execAPI := api.NewExecAPI(execSvc)
	termSessionAPI := api.NewTerminalSessionAPI(sessionSvc)
	systemAPI := api.NewSystemAPI(systemSvc)
	cronAPI := api.NewCronAPI(cronSvc)

	// 启动定时任务
	cronSvc.StartAllJobs()

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
		// 当前用户
		auth.GET("/user/current", authAPI.GetCurrentUser)
		auth.PUT("/user/current/password", userAPI.UpdateCurrentPassword)
		auth.GET("/user/current/permissions", roleAPI.GetCurrentUserPermissions)

		// 用户管理
		users := auth.Group("/user")
		{
			users.GET("", middleware.RequirePermission("user:query"), userAPI.List)
			users.POST("", middleware.RequirePermission("user:create"),
				middleware.AuditLog("user", "create", 2), userAPI.Create)
			users.PUT("/:id", middleware.RequirePermission("user:update"),
				middleware.AuditLog("user", "update", 2), userAPI.Update)
			users.DELETE("/:id", middleware.RequirePermission("user:delete"),
				middleware.AuditLog("user", "delete", 3), userAPI.Delete)
			users.PUT("/:id/password", middleware.RequirePermission("user:update"),
				middleware.AuditLog("user", "resetPassword", 3), userAPI.ResetPassword)
			users.GET("/:id/roles", middleware.RequirePermission("user:query"), roleAPI.GetUserRoles)
			users.PUT("/:id/roles", middleware.RequirePermission("user:update"),
				middleware.AuditLog("user", "updateRoles", 2), roleAPI.UpdateUserRoles)
		}

		// 角色管理
		roles := auth.Group("/role")
		{
			roles.GET("", roleAPI.List)
			roles.GET("/:id", roleAPI.Get)
			roles.POST("", middleware.RequirePermission("role:create"),
				middleware.AuditLog("role", "create", 2), roleAPI.Create)
			roles.PUT("/:id", middleware.RequirePermission("role:update"),
				middleware.AuditLog("role", "update", 2), roleAPI.Update)
			roles.DELETE("/:id", middleware.RequirePermission("role:delete"),
				middleware.AuditLog("role", "delete", 3), roleAPI.Delete)
			roles.GET("/:id/menus", roleAPI.GetRoleMenus)
			roles.PUT("/:id/menus", middleware.RequirePermission("role:update"),
				middleware.AuditLog("role", "updateMenus", 2), roleAPI.UpdateRoleMenus)
		}

		// 菜单管理
		auth.GET("/menu", roleAPI.MenuList)

		// 主机管理
		hosts := auth.Group("/host")
		{
			hosts.GET("", hostAPI.List)
			hosts.GET("/:id", hostAPI.Get)
			hosts.POST("", middleware.RequirePermission("host:create"),
				middleware.AuditLog("host", "create", 1), hostAPI.Create)
			hosts.PUT("/:id", middleware.RequirePermission("host:update"),
				middleware.AuditLog("host", "update", 1), hostAPI.Update)
			hosts.DELETE("/:id", middleware.RequirePermission("host:delete"),
				middleware.AuditLog("host", "delete", 2), hostAPI.Delete)
		}

		// 主机凭证管理
		identities := auth.Group("/host-identity")
		{
			identities.GET("", middleware.RequirePermission("identity:query"), identityAPI.List)
			identities.GET("/:id", middleware.RequirePermission("identity:query"), identityAPI.Get)
			identities.POST("", middleware.RequirePermission("identity:create"),
				middleware.AuditLog("identity", "create", 2), identityAPI.Create)
			identities.PUT("/:id", middleware.RequirePermission("identity:update"),
				middleware.AuditLog("identity", "update", 2), identityAPI.Update)
			identities.DELETE("/:id", middleware.RequirePermission("identity:delete"),
				middleware.AuditLog("identity", "delete", 2), identityAPI.Delete)
		}

		// 主机分组管理
		groups := auth.Group("/host-group")
		{
			groups.GET("", groupAPI.List)
			groups.POST("", middleware.RequirePermission("hostGroup:create"),
				middleware.AuditLog("hostGroup", "create", 1), groupAPI.Create)
			groups.PUT("/:id", middleware.RequirePermission("hostGroup:update"),
				middleware.AuditLog("hostGroup", "update", 1), groupAPI.Update)
			groups.DELETE("/:id", middleware.RequirePermission("hostGroup:delete"),
				middleware.AuditLog("hostGroup", "delete", 2), groupAPI.Delete)
			groups.GET("/:id/hosts", groupAPI.GetGroupHosts)
			groups.PUT("/:id/hosts", middleware.RequirePermission("hostGroup:update"),
				middleware.AuditLog("hostGroup", "updateHosts", 1), groupAPI.UpdateGroupHosts)
		}

		// SFTP 文件管理
		sftpGroup := auth.Group("/sftp/:hostId")
		{
			sftpGroup.GET("/list", sftpAPI.List)
			sftpGroup.POST("/mkdir", middleware.AuditLog("sftp", "mkdir", 1), sftpAPI.Mkdir)
			sftpGroup.POST("/remove", middleware.AuditLog("sftp", "remove", 2), sftpAPI.Remove)
			sftpGroup.GET("/download", sftpAPI.Download)
			sftpGroup.POST("/upload", middleware.AuditLog("sftp", "upload", 1), sftpAPI.Upload)
			sftpGroup.GET("/content", sftpAPI.Content)
			sftpGroup.POST("/save", middleware.AuditLog("sftp", "save", 1), sftpAPI.SaveContent)
		}

		// 批量命令执行
		exec := auth.Group("/exec")
		{
			exec.POST("/job", middleware.RequirePermission("exec:execute"),
				middleware.AuditLog("exec", "create", 2), execAPI.CreateJob)
			exec.GET("/job", middleware.RequirePermission("exec:query"), execAPI.ListJobs)
			exec.GET("/job/:id", middleware.RequirePermission("exec:query"), execAPI.GetJob)
			exec.GET("/job/:id/hosts", middleware.RequirePermission("exec:query"), execAPI.GetJobHosts)
			exec.PUT("/job/:id/cancel", middleware.RequirePermission("exec:execute"),
				middleware.AuditLog("exec", "cancel", 1), execAPI.CancelJob)
		}

		// 命令片段
		snippets := auth.Group("/command-snippet")
		{
			snippets.GET("", execAPI.ListSnippets)
			snippets.POST("", execAPI.CreateSnippet)
			snippets.PUT("/:id", execAPI.UpdateSnippet)
			snippets.DELETE("/:id", execAPI.DeleteSnippet)
		}

		// 终端录屏回放
		termSession := auth.Group("/terminal-session")
		{
			termSession.GET("", middleware.RequirePermission("audit:query"), termSessionAPI.List)
			termSession.GET("/:id", middleware.RequirePermission("audit:query"), termSessionAPI.Get)
			termSession.GET("/:id/data", middleware.RequirePermission("audit:query"), termSessionAPI.GetData)
			termSession.DELETE("/:id", middleware.RequirePermission("audit:delete"),
				middleware.AuditLog("terminalSession", "delete", 2), termSessionAPI.Delete)
		}

		// 系统配置
		system := auth.Group("/system")
		{
			system.GET("/setting", middleware.RequirePermission("system:query"), systemAPI.GetSettings)
			system.PUT("/setting/:item", middleware.RequirePermission("system:update"),
				middleware.AuditLog("system", "updateSetting", 2), systemAPI.UpdateSetting)
		}

		// 字典管理
		dict := auth.Group("/dict")
		{
			dict.GET("/key", systemAPI.ListDictKeys)
			dict.POST("/key", middleware.RequirePermission("system:update"), systemAPI.CreateDictKey)
			dict.DELETE("/key/:id", middleware.RequirePermission("system:update"), systemAPI.DeleteDictKey)
			dict.GET("/value/:keyName", systemAPI.ListDictValues)
			dict.POST("/value", middleware.RequirePermission("system:update"), systemAPI.CreateDictValue)
			dict.DELETE("/value/:id", middleware.RequirePermission("system:update"), systemAPI.DeleteDictValue)
		}

		// 定时任务
		cron := auth.Group("/cron")
		{
			cron.GET("", middleware.RequirePermission("cron:query"), cronAPI.List)
			cron.POST("", middleware.RequirePermission("cron:create"),
				middleware.AuditLog("cron", "create", 2), cronAPI.Create)
			cron.PUT("/:id", middleware.RequirePermission("cron:update"),
				middleware.AuditLog("cron", "update", 2), cronAPI.Update)
			cron.DELETE("/:id", middleware.RequirePermission("cron:delete"),
				middleware.AuditLog("cron", "delete", 2), cronAPI.Delete)
			cron.POST("/:id/trigger", middleware.RequirePermission("cron:execute"),
				middleware.AuditLog("cron", "trigger", 2), cronAPI.Trigger)
			cron.GET("/:id/logs", middleware.RequirePermission("cron:query"), cronAPI.GetLogs)
		}

		// 审计日志
		audit := auth.Group("/audit")
		{
			audit.GET("/operation-log", middleware.RequirePermission("audit:query"), auditAPI.ListOperationLogs)
			audit.GET("/connect-log", middleware.RequirePermission("audit:query"), auditAPI.ListConnectLogs)
		}
	}

	// WebSocket 接口（需要 token 参数认证）
	wsGroup := r.Group("/ws", wsTokenAuth())
	{
		wsGroup.GET("/terminal/:hostId", ws.HandleTerminalWS(&ws.TerminalDeps{
			GetSSHConfig: getSSHConfig,
			SessionSvc:   sessionSvc,
			HostName: func(hostID int64) (string, string) {
				host, err := hostSvc.GetByID(hostID)
				if err != nil {
					return "", ""
				}
				return host.Name, host.Address
			},
		}))
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

func autoMigrate(db *gorm.DB) {
	db.AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.UserRole{},
		&model.Menu{},
		&model.RoleMenu{},
		&model.Host{},
		&model.HostIdentity{},
		&model.HostConfig{},
		&model.HostGroup{},
		&model.HostGroupRel{},
		&model.OperationLog{},
		&model.ConnectLog{},
		&model.CommandSnippet{},
		&model.CommandSnippetGroup{},
		&model.ExecJob{},
		&model.ExecJobHost{},
		&model.TerminalSession{},
		&model.TerminalSessionData{},
		&model.SystemSetting{},
		&model.DictKey{},
		&model.DictValue{},
		&model.CronJob{},
		&model.CronJobLog{},
	)
	log.Println("数据库迁移完成")
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
