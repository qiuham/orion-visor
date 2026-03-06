package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	"github.com/orion-visor/server/pkg/response"
)

type HostGroupAPI struct {
	groupSvc *service.HostGroupService
}

func NewHostGroupAPI(groupSvc *service.HostGroupService) *HostGroupAPI {
	return &HostGroupAPI{groupSvc: groupSvc}
}

func (a *HostGroupAPI) List(c *gin.Context) {
	groups, err := a.groupSvc.List()
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, groups)
}

func (a *HostGroupAPI) Create(c *gin.Context) {
	var req model.HostGroupCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	group, err := a.groupSvc.Create(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, group)
}

func (a *HostGroupAPI) Update(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req model.HostGroupUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.groupSvc.Update(id, &req); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *HostGroupAPI) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.groupSvc.Delete(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// GetGroupHosts 获取分组下的主机
func (a *HostGroupAPI) GetGroupHosts(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	hostIDs, err := a.groupSvc.GetGroupHosts(id)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, hostIDs)
}

// UpdateGroupHosts 更新分组下的主机
func (a *HostGroupAPI) UpdateGroupHosts(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req model.HostGroupRelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.groupSvc.UpdateGroupHosts(id, req.HostIDs); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}
