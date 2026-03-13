package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ops-platform/server/internal/model"
	"github.com/ops-platform/server/internal/service"
	"github.com/ops-platform/server/pkg/response"
)

type HostAPI struct {
	hostSvc *service.HostService
}

func NewHostAPI(hostSvc *service.HostService) *HostAPI {
	return &HostAPI{hostSvc: hostSvc}
}

// List 主机列表（分页）
func (h *HostAPI) List(c *gin.Context) {
	var req model.HostListRequest
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
	hosts, total, err := h.hostSvc.List(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OKPage(c, total, hosts)
}

// Get 获取主机详情
func (h *HostAPI) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, "无效的ID")
		return
	}
	host, err := h.hostSvc.GetByID(id)
	if err != nil {
		response.Fail(c, "主机不存在")
		return
	}
	response.OK(c, host)
}

// Create 创建主机
func (h *HostAPI) Create(c *gin.Context) {
	var req model.HostCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	username, _ := c.Get("username")
	host, err := h.hostSvc.Create(&req, username.(string))
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, host)
}

// Update 更新主机
func (h *HostAPI) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, "无效的ID")
		return
	}
	var req model.HostUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := h.hostSvc.Update(id, &req); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除主机
func (h *HostAPI) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, "无效的ID")
		return
	}
	if err := h.hostSvc.Delete(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}
