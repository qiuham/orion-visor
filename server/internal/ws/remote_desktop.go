package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/orion-visor/server/internal/guacd"
	"github.com/orion-visor/server/internal/service"
)

// RemoteDesktopMessage 前端 → 后端的消息格式
type RemoteDesktopMessage struct {
	Type string `json:"type"` // connect, data, disconnect, resize
	Data string `json:"data,omitempty"`
	// connect 时的参数
	Width  int `json:"width,omitempty"`
	Height int `json:"height,omitempty"`
}

// RemoteDesktopSession 远程桌面会话
type RemoteDesktopSession struct {
	ID       string
	UserID   int64
	HostID   int64
	Protocol string // rdp, vnc
	Tunnel   *guacd.Tunnel
	WS       *websocket.Conn
	done     chan struct{}
}

// RemoteDesktopSessionManager 远程桌面会话管理
type RemoteDesktopSessionManager struct {
	mu       sync.RWMutex
	sessions map[string]*RemoteDesktopSession
}

var RDSessions = &RemoteDesktopSessionManager{
	sessions: make(map[string]*RemoteDesktopSession),
}

func (m *RemoteDesktopSessionManager) Add(s *RemoteDesktopSession) {
	m.mu.Lock()
	m.sessions[s.ID] = s
	m.mu.Unlock()
}

func (m *RemoteDesktopSessionManager) Remove(id string) {
	m.mu.Lock()
	delete(m.sessions, id)
	m.mu.Unlock()
}

func (m *RemoteDesktopSessionManager) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.sessions)
}

// RemoteDesktopDeps 远程桌面处理器依赖
type RemoteDesktopDeps struct {
	GuacdAddr  string
	GetRDPConfig func(hostID int64) (*guacd.RDPConfig, error)
	GetVNCConfig func(hostID int64) (*guacd.VNCConfig, error)
	SessionSvc   *service.TerminalSessionService
	HostName     func(hostID int64) (string, string)
}

// HandleRDPWS 处理 RDP WebSocket 连接
func HandleRDPWS(deps *RemoteDesktopDeps) gin.HandlerFunc {
	return handleRemoteDesktop(deps, "rdp")
}

// HandleVNCWS 处理 VNC WebSocket 连接
func HandleVNCWS(deps *RemoteDesktopDeps) gin.HandlerFunc {
	return handleRemoteDesktop(deps, "vnc")
}

func handleRemoteDesktop(deps *RemoteDesktopDeps, protocol string) gin.HandlerFunc {
	return func(c *gin.Context) {
		hostIDStr := c.Param("hostId")
		hostID, err := strconv.ParseInt(hostIDStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid hostId"})
			return
		}

		userID, _ := c.Get("userId")
		username, _ := c.Get("username")
		usernameStr, _ := username.(string)

		// WebSocket 升级
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("ws upgrade error: %v", err)
			return
		}
		defer conn.Close()

		// 从 query 参数获取分辨率
		width, _ := strconv.Atoi(c.DefaultQuery("width", "1920"))
		height, _ := strconv.Atoi(c.DefaultQuery("height", "1080"))

		// 建立 guacd 隧道
		var tunnel *guacd.Tunnel
		switch protocol {
		case "rdp":
			rdpCfg, err := deps.GetRDPConfig(hostID)
			if err != nil {
				writeWSError(conn, "获取 RDP 配置失败: "+err.Error())
				return
			}
			if width > 0 {
				rdpCfg.Width = width
			}
			if height > 0 {
				rdpCfg.Height = height
			}
			tunnel, err = guacd.ConnectRDP(deps.GuacdAddr, rdpCfg)
			if err != nil {
				writeWSError(conn, "RDP 连接失败: "+err.Error())
				return
			}
		case "vnc":
			vncCfg, err := deps.GetVNCConfig(hostID)
			if err != nil {
				writeWSError(conn, "获取 VNC 配置失败: "+err.Error())
				return
			}
			if width > 0 {
				vncCfg.Width = width
			}
			if height > 0 {
				vncCfg.Height = height
			}
			tunnel, err = guacd.ConnectVNC(deps.GuacdAddr, vncCfg)
			if err != nil {
				writeWSError(conn, "VNC 连接失败: "+err.Error())
				return
			}
		}
		defer tunnel.Close()

		// 创建会话
		sessionID := protocol + "-" + hostIDStr + "-" + strconv.FormatInt(userID.(int64), 10) + "-" + strconv.FormatInt(time.Now().UnixMilli(), 36)
		rdSession := &RemoteDesktopSession{
			ID:       sessionID,
			UserID:   userID.(int64),
			HostID:   hostID,
			Protocol: protocol,
			Tunnel:   tunnel,
			WS:       conn,
			done:     make(chan struct{}),
		}
		RDSessions.Add(rdSession)
		defer RDSessions.Remove(sessionID)

		// 记录连接日志
		if deps.SessionSvc != nil {
			hostName, hostAddr := "", ""
			if deps.HostName != nil {
				hostName, hostAddr = deps.HostName(hostID)
			}
			deps.SessionSvc.CreateSession(
				userID.(int64), usernameStr, hostID, hostName, hostAddr, sessionID,
			)
			defer deps.SessionSvc.CloseSession(sessionID)
		}

		// 通知前端连接 UUID
		connMsg, _ := json.Marshal(map[string]string{
			"type": "connected",
			"uuid": tunnel.UUID,
		})
		conn.WriteMessage(websocket.TextMessage, connMsg)

		// 从 guacd 读取数据 → 发送到 WebSocket (浏览器)
		go func() {
			defer close(rdSession.done)
			for {
				raw, err := tunnel.ReadRaw()
				if err != nil {
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, []byte(raw)); err != nil {
					return
				}
			}
		}()

		// 从 WebSocket (浏览器) 读取数据 → 发送到 guacd
		for {
			_, msgBytes, err := conn.ReadMessage()
			if err != nil {
				return
			}

			// 前端可能直接发送 Guacamole 协议格式的数据
			msgStr := string(msgBytes)
			if len(msgStr) > 0 && msgStr[len(msgStr)-1] == ';' {
				// 原生 Guacamole 协议指令，直接转发
				if err := tunnel.WriteRaw(msgBytes); err != nil {
					return
				}
				continue
			}

			// 尝试 JSON 格式（兼容自定义消息格式）
			var msg RemoteDesktopMessage
			if err := json.Unmarshal(msgBytes, &msg); err != nil {
				// 不是 JSON 也不是 Guac 协议，丢弃
				continue
			}
			switch msg.Type {
			case "data":
				if err := tunnel.WriteRaw([]byte(msg.Data)); err != nil {
					return
				}
			case "resize":
				sizeInst := guacd.NewInstruction(guacd.OpcodeSize,
					strconv.Itoa(msg.Width), strconv.Itoa(msg.Height))
				if err := tunnel.WriteInstruction(sizeInst); err != nil {
					return
				}
			case "disconnect":
				return
			}
		}
	}
}
