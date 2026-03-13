package api

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/ops-platform/server/internal/monitor"
	internalssh "github.com/ops-platform/server/internal/ssh"
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type MonitorAPI struct {
	getSSHConfig func(hostID int64) (*internalssh.ConnectConfig, error)
	interval     time.Duration
	retain       int
}

func NewMonitorAPI(
	getSSHConfig func(hostID int64) (*internalssh.ConnectConfig, error),
	interval time.Duration,
	retain int,
) *MonitorAPI {
	return &MonitorAPI{
		getSSHConfig: getSSHConfig,
		interval:     interval,
		retain:       retain,
	}
}

// HandleMonitorWS 处理实时监控 WebSocket 连接
// 连接建立后，通过 SSH 定时采集指标并推送到前端
func (a *MonitorAPI) HandleMonitorWS(c *gin.Context) {
	hostIDStr := c.Param("hostId")
	hostID, err := strconv.ParseInt(hostIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的hostId"})
		return
	}

	// 升级 WebSocket
	conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket 升级失败: %v", err)
		return
	}

	// 获取 SSH 配置
	sshCfg, err := a.getSSHConfig(hostID)
	if err != nil {
		writeError(conn, "获取主机配置失败: "+err.Error())
		conn.Close()
		return
	}

	// 建立 SSH 连接（用于指标采集）
	client, err := internalssh.Connect(sshCfg)
	if err != nil {
		writeError(conn, "SSH 连接失败: "+err.Error())
		conn.Close()
		return
	}

	// 启动监控会话
	monitor.Manager.StartSession(hostID, client, conn, a.interval, a.retain)

	// 监听 WebSocket 关闭
	go func() {
		defer func() {
			monitor.Manager.StopSession(hostID)
			client.Close()
			conn.Close()
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return
			}
		}
	}()
}

func writeError(conn *websocket.Conn, msg string) {
	conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"error","data":"`+msg+`"}`))
}
