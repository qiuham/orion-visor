package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ops-platform/server/internal/model"
	"github.com/ops-platform/server/internal/service"
	"github.com/ops-platform/server/pkg/response"
)

type SystemAPI struct {
	systemSvc *service.SystemService
}

func NewSystemAPI(systemSvc *service.SystemService) *SystemAPI {
	return &SystemAPI{systemSvc: systemSvc}
}

// --- 系统参数 ---

func (a *SystemAPI) GetSettings(c *gin.Context) {
	settingType := c.DefaultQuery("type", "")
	settings, err := a.systemSvc.GetSettings(settingType)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, settings)
}

func (a *SystemAPI) UpdateSetting(c *gin.Context) {
	item := c.Param("item")
	var req model.SystemSettingUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.systemSvc.UpdateSetting(item, req.Value); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// --- 字典 ---

func (a *SystemAPI) ListDictKeys(c *gin.Context) {
	keys, err := a.systemSvc.ListDictKeys()
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, keys)
}

func (a *SystemAPI) CreateDictKey(c *gin.Context) {
	var req model.DictKeyCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	key, err := a.systemSvc.CreateDictKey(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, key)
}

func (a *SystemAPI) DeleteDictKey(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.systemSvc.DeleteDictKey(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *SystemAPI) ListDictValues(c *gin.Context) {
	keyName := c.Param("keyName")
	values, err := a.systemSvc.ListDictValues(keyName)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, values)
}

func (a *SystemAPI) CreateDictValue(c *gin.Context) {
	var req model.DictValueCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	value, err := a.systemSvc.CreateDictValue(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, value)
}

func (a *SystemAPI) DeleteDictValue(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.systemSvc.DeleteDictValue(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// --- 统计概览 ---

func (a *SystemAPI) GetStats(c *gin.Context) {
	response.OK(c, gin.H{
		"hostCount":       a.systemSvc.CountHosts(),
		"userCount":       a.systemSvc.CountUsers(),
		"sessionCount":    a.systemSvc.CountTerminalSessions(),
		"todayOperations": a.systemSvc.CountTodayOperations(),
		"execJobCount":    a.systemSvc.CountExecJobs(),
		"cronJobCount":    a.systemSvc.CountCronJobs(),
	})
}

// GetStatsTrend 趋势统计
func (a *SystemAPI) GetStatsTrend(c *gin.Context) {
	days := 14
	if d := c.Query("days"); d != "" {
		if v, err := strconv.Atoi(d); err == nil && v > 0 && v <= 90 {
			days = v
		}
	}
	response.OK(c, gin.H{
		"connectionTrend":  a.systemSvc.GetConnectionTrend(days),
		"operationTrend":   a.systemSvc.GetOperationTrend(days),
		"execTrend":        a.systemSvc.GetExecTrend(days),
		"operationByModule": a.systemSvc.GetOperationByModule(),
		"hostByType":       a.systemSvc.GetHostByType(),
		"connectionByType": a.systemSvc.GetConnectionByType(),
	})
}
