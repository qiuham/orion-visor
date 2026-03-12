package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	"github.com/orion-visor/server/pkg/response"
)

type GrantAPI struct {
	grantSvc *service.GrantService
}

func NewGrantAPI(grantSvc *service.GrantService) *GrantAPI {
	return &GrantAPI{grantSvc: grantSvc}
}

// GetGrantedHosts 获取某个用户/角色已授权的主机 ID
func (a *GrantAPI) GetGrantedHosts(c *gin.Context) {
	grantType := c.Query("grantType")
	grantID, _ := strconv.ParseInt(c.Query("grantId"), 10, 64)
	if grantType == "" || grantID == 0 {
		response.Fail(c, "缺少参数")
		return
	}
	hostIDs, err := a.grantSvc.GetGrantedHostIDs(grantType, grantID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, hostIDs)
}

// UpdateGrant 更新授权关系
func (a *GrantAPI) UpdateGrant(c *gin.Context) {
	var req model.AssetGrantUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.grantSvc.UpdateGrant(&req); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// GetUserAccessibleHosts 获取用户可访问的全部主机
func (a *GrantAPI) GetUserAccessibleHosts(c *gin.Context) {
	userID, _ := strconv.ParseInt(c.Param("userId"), 10, 64)
	if userID == 0 {
		response.Fail(c, "缺少用户 ID")
		return
	}
	hostIDs, err := a.grantSvc.GetUserAccessibleHostIDs(userID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, hostIDs)
}
