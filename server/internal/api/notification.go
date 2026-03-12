package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	"github.com/orion-visor/server/pkg/response"
)

type NotificationAPI struct {
	notifSvc *service.NotificationService
}

func NewNotificationAPI(notifSvc *service.NotificationService) *NotificationAPI {
	return &NotificationAPI{notifSvc: notifSvc}
}

func (a *NotificationAPI) List(c *gin.Context) {
	userID := c.GetInt64("userId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	var status *int8
	if s := c.Query("status"); s != "" {
		v, _ := strconv.ParseInt(s, 10, 8)
		sv := int8(v)
		status = &sv
	}

	list, total, err := a.notifSvc.List(userID, status, page, pageSize)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, gin.H{
		"rows":  list,
		"total": total,
	})
}

func (a *NotificationAPI) Create(c *gin.Context) {
	var req model.NotificationCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	n, err := a.notifSvc.Create(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, n)
}

func (a *NotificationAPI) MarkRead(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	userID := c.GetInt64("userId")
	if err := a.notifSvc.MarkRead(id, userID); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *NotificationAPI) MarkAllRead(c *gin.Context) {
	userID := c.GetInt64("userId")
	if err := a.notifSvc.MarkAllRead(userID); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *NotificationAPI) CountUnread(c *gin.Context) {
	userID := c.GetInt64("userId")
	count := a.notifSvc.CountUnread(userID)
	response.OK(c, gin.H{"count": count})
}

func (a *NotificationAPI) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.notifSvc.Delete(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}
