package api

import (
	"crypto/md5"
	"encoding/hex"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ops-platform/server/internal/model"
	"github.com/ops-platform/server/internal/service"
	"github.com/ops-platform/server/pkg/response"
)

type UserAPI struct {
	userSvc *service.UserService
}

func NewUserAPI(userSvc *service.UserService) *UserAPI {
	return &UserAPI{userSvc: userSvc}
}

// List 用户列表
func (a *UserAPI) List(c *gin.Context) {
	var req model.UserListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	users, total, err := a.userSvc.List(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OKPage(c, total, users)
}

// Create 创建用户
func (a *UserAPI) Create(c *gin.Context) {
	var req model.UserCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	user, err := a.userSvc.Create(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, user)
}

// Update 更新用户
func (a *UserAPI) Update(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req model.UserUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.userSvc.Update(id, &req); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除用户
func (a *UserAPI) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	// 不允许删除自己
	currentID := c.GetInt64("userId")
	if id == currentID {
		response.Fail(c, "不能删除自己")
		return
	}
	if err := a.userSvc.Delete(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// ResetPassword 重置密码
func (a *UserAPI) ResetPassword(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	h := md5.Sum([]byte(req.Password))
	hashed := hex.EncodeToString(h[:])
	if err := a.userSvc.UpdatePassword(id, hashed); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// UpdateCurrentPassword 修改当前用户密码
func (a *UserAPI) UpdateCurrentPassword(c *gin.Context) {
	userID := c.GetInt64("userId")
	var req struct {
		OldPassword string `json:"oldPassword" binding:"required"`
		NewPassword string `json:"newPassword" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	user, err := a.userSvc.GetByID(userID)
	if err != nil {
		response.Fail(c, "用户不存在")
		return
	}
	oldHash := md5.Sum([]byte(req.OldPassword))
	if hex.EncodeToString(oldHash[:]) != user.Password {
		response.Fail(c, "原密码错误")
		return
	}
	newHash := md5.Sum([]byte(req.NewPassword))
	if err := a.userSvc.UpdatePassword(userID, hex.EncodeToString(newHash[:])); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}
