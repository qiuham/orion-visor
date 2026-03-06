package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/pkg/response"
	"gorm.io/gorm"
)

var permDB *gorm.DB

// InitPermission 初始化权限中间件（需在启动时调用）
func InitPermission(db *gorm.DB) {
	permDB = db
}

// RequirePermission 检查当前用户是否拥有指定权限
func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt64("userId")
		if userID == 0 {
			response.Unauthorized(c, "未登录")
			c.Abort()
			return
		}

		// admin 角色跳过权限检查
		if isAdmin(userID) {
			c.Next()
			return
		}

		if !hasPermission(userID, permission) {
			response.Forbidden(c, "没有操作权限")
			c.Abort()
			return
		}
		c.Next()
	}
}

func isAdmin(userID int64) bool {
	var count int64
	permDB.Table("system_user_role").
		Joins("JOIN system_role ON system_role.id = system_user_role.role_id").
		Where("system_user_role.user_id = ? AND system_role.code = ?", userID, "admin").
		Count(&count)
	return count > 0
}

func hasPermission(userID int64, permission string) bool {
	var count int64
	permDB.Table("system_menu").
		Joins("JOIN system_role_menu ON system_role_menu.menu_id = system_menu.id").
		Joins("JOIN system_user_role ON system_user_role.role_id = system_role_menu.role_id").
		Where("system_user_role.user_id = ? AND system_menu.permission = ? AND system_menu.status = 1", userID, permission).
		Count(&count)
	return count > 0
}
