package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ops-platform/server/internal/service"
	"github.com/ops-platform/server/pkg/response"
)

type RemoteDesktopAPI struct {
	rdSvc *service.RemoteDesktopService
}

func NewRemoteDesktopAPI(rdSvc *service.RemoteDesktopService) *RemoteDesktopAPI {
	return &RemoteDesktopAPI{rdSvc: rdSvc}
}

type hostConfigRequest struct {
	Config string `json:"config" binding:"required"` // JSON 格式配置
}

// GetHostConfig 获取主机协议配置
func (a *RemoteDesktopAPI) GetHostConfig(c *gin.Context) {
	hostID, _ := strconv.ParseInt(c.Param("hostId"), 10, 64)
	hostType := c.Param("type") // RDP, VNC, SSH
	config, err := a.rdSvc.GetHostConfig(hostID, hostType)
	if err != nil {
		response.OK(c, nil) // 没有配置返回空
		return
	}
	response.OK(c, config)
}

// SaveHostConfig 保存主机协议配置
func (a *RemoteDesktopAPI) SaveHostConfig(c *gin.Context) {
	hostID, _ := strconv.ParseInt(c.Param("hostId"), 10, 64)
	hostType := c.Param("type")
	var req hostConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.rdSvc.SaveHostConfig(hostID, hostType, req.Config); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}
