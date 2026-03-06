package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	"github.com/orion-visor/server/pkg/response"
)

type TerminalSessionAPI struct {
	sessionSvc *service.TerminalSessionService
}

func NewTerminalSessionAPI(sessionSvc *service.TerminalSessionService) *TerminalSessionAPI {
	return &TerminalSessionAPI{sessionSvc: sessionSvc}
}

// List 录屏会话列表
func (a *TerminalSessionAPI) List(c *gin.Context) {
	var req model.TerminalSessionListRequest
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
	sessions, total, err := a.sessionSvc.ListSessions(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OKPage(c, total, sessions)
}

// Get 会话详情
func (a *TerminalSessionAPI) Get(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	session, err := a.sessionSvc.GetSession(id)
	if err != nil {
		response.Fail(c, "会话不存在")
		return
	}
	response.OK(c, session)
}

// GetData 获取录屏数据（回放用）
func (a *TerminalSessionAPI) GetData(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	data, err := a.sessionSvc.GetSessionData(id)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, data)
}

// Delete 删除录屏会话
func (a *TerminalSessionAPI) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.sessionSvc.DeleteSession(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}
