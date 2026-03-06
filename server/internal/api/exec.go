package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	"github.com/orion-visor/server/pkg/response"
)

type ExecAPI struct {
	execSvc *service.ExecService
}

func NewExecAPI(execSvc *service.ExecService) *ExecAPI {
	return &ExecAPI{execSvc: execSvc}
}

// CreateJob 创建批量执行任务
func (a *ExecAPI) CreateJob(c *gin.Context) {
	var req model.ExecJobCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	userID := c.GetInt64("userId")
	username, _ := c.Get("username")
	job, err := a.execSvc.CreateJob(&req, userID, username.(string))
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, job)
}

// ListJobs 任务列表
func (a *ExecAPI) ListJobs(c *gin.Context) {
	var req model.ExecJobListRequest
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
	jobs, total, err := a.execSvc.ListJobs(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OKPage(c, total, jobs)
}

// GetJob 任务详情
func (a *ExecAPI) GetJob(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	job, err := a.execSvc.GetJob(id)
	if err != nil {
		response.Fail(c, "任务不存在")
		return
	}
	response.OK(c, job)
}

// GetJobHosts 任务各主机执行结果
func (a *ExecAPI) GetJobHosts(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	hosts, err := a.execSvc.GetJobHosts(id)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, hosts)
}

// CancelJob 取消任务
func (a *ExecAPI) CancelJob(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.execSvc.CancelJob(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// --- 命令片段 ---

func (a *ExecAPI) ListSnippets(c *gin.Context) {
	userID := c.GetInt64("userId")
	snippets, err := a.execSvc.ListSnippets(userID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, snippets)
}

func (a *ExecAPI) CreateSnippet(c *gin.Context) {
	var req model.CommandSnippetCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	userID := c.GetInt64("userId")
	snippet, err := a.execSvc.CreateSnippet(&req, userID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, snippet)
}

func (a *ExecAPI) UpdateSnippet(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req model.CommandSnippetUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.execSvc.UpdateSnippet(id, &req); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *ExecAPI) DeleteSnippet(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.execSvc.DeleteSnippet(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}
