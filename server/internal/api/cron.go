package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	"github.com/orion-visor/server/pkg/response"
)

type CronAPI struct {
	cronSvc *service.CronService
}

func NewCronAPI(cronSvc *service.CronService) *CronAPI {
	return &CronAPI{cronSvc: cronSvc}
}

func (a *CronAPI) List(c *gin.Context) {
	jobs, err := a.cronSvc.List()
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, jobs)
}

func (a *CronAPI) Create(c *gin.Context) {
	var req model.CronJobCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	job, err := a.cronSvc.Create(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, job)
}

func (a *CronAPI) Update(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req model.CronJobUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.cronSvc.Update(id, &req); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *CronAPI) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.cronSvc.Delete(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *CronAPI) Trigger(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.cronSvc.TriggerJob(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *CronAPI) GetLogs(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	logs, total, err := a.cronSvc.GetLogs(id, page, pageSize)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OKPage(c, total, logs)
}
