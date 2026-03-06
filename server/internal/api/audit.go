package api

import (
	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	"github.com/orion-visor/server/pkg/response"
)

type AuditAPI struct {
	auditSvc *service.AuditService
}

func NewAuditAPI(auditSvc *service.AuditService) *AuditAPI {
	return &AuditAPI{auditSvc: auditSvc}
}

// ListOperationLogs 操作日志列表
func (a *AuditAPI) ListOperationLogs(c *gin.Context) {
	var req model.OperationLogListRequest
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
	logs, total, err := a.auditSvc.ListOperationLogs(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OKPage(c, total, logs)
}

// ListConnectLogs 连接日志列表
func (a *AuditAPI) ListConnectLogs(c *gin.Context) {
	var req model.ConnectLogListRequest
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
	logs, total, err := a.auditSvc.ListConnectLogs(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OKPage(c, total, logs)
}
