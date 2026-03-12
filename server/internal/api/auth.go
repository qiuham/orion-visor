package api

import (
	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/middleware"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	"github.com/orion-visor/server/pkg/response"
)

type AuthAPI struct {
	userSvc *service.UserService
}

func NewAuthAPI(userSvc *service.UserService) *AuthAPI {
	return &AuthAPI{userSvc: userSvc}
}

// Login 用户登录
func (a *AuthAPI) Login(c *gin.Context) {
	var req model.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}

	user, err := a.userSvc.Login(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Username)
	if err != nil {
		response.Fail(c, "生成令牌失败")
		return
	}

	response.OK(c, model.LoginResponse{
		Token: token,
		User:  user,
	})
}

// GetCurrentUser 获取当前登录用户信息
func (a *AuthAPI) GetCurrentUser(c *gin.Context) {
	userID := c.GetInt64("userId")
	user, err := a.userSvc.GetByID(userID)
	if err != nil {
		response.Fail(c, "用户不存在")
		return
	}
	response.OK(c, user)
}

// Logout 退出登录
func (a *AuthAPI) Logout(c *gin.Context) {
	// JWT 是无状态的，服务端无需操作
	// 如果后续需要 token 黑名单，可在此处添加
	response.OK(c, nil)
}
