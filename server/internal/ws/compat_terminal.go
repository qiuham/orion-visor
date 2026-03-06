package ws

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/orion-visor/server/internal/api"
	"github.com/orion-visor/server/internal/middleware"
	"github.com/orion-visor/server/internal/service"
	internalssh "github.com/orion-visor/server/internal/ssh"
)

// HandleCompatTerminalWS 前端兼容的终端 WebSocket 处理器
// 路径: /orion-visor/keep-alive/terminal/access/:protocol/:accessToken
// 使用 orion-visor 自定义管道分隔协议: type|param1|param2...
func HandleCompatTerminalWS(deps *TerminalDeps, hostSvc *service.HostService) gin.HandlerFunc {
	return func(c *gin.Context) {
		protocol := c.Param("protocol")
		accessToken := c.Param("accessToken")

		// 解码 accessToken → hostId + jwt
		hostID, jwt, err := api.DecodeAccessToken(accessToken)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid access token"})
			return
		}

		// 验证 JWT
		claims, err := middleware.ParseToken(jwt)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		// WebSocket 升级
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("ws upgrade error: %v", err)
			return
		}
		defer conn.Close()

		_ = protocol // SSH, SFTP, RDP, VNC

		// 获取 SSH 配置
		sshCfg, err := deps.GetSSHConfig(hostID)
		if err != nil {
			sendProtoMsg(conn, "cl", "1", "获取主机配置失败: "+err.Error())
			return
		}

		// SSH 连接
		client, err := internalssh.Connect(sshCfg)
		if err != nil {
			sendProtoMsg(conn, "cl", "1", "SSH 连接失败: "+err.Error())
			return
		}
		defer client.Close()

		// 创建 shell
		cols, rows := 120, 30
		session, stdin, stdout, err := client.NewShell(cols, rows)
		if err != nil {
			sendProtoMsg(conn, "cl", "1", "Shell 创建失败: "+err.Error())
			return
		}
		defer session.Close()

		// 会话管理
		sessionID := "s-" + strconv.FormatInt(hostID, 10) + "-" + strconv.FormatInt(time.Now().UnixMilli(), 36)
		ts := &TerminalSession{
			ID:     sessionID,
			UserID: claims.UserID,
			HostID: hostID,
			Client: client,
			WS:     conn,
			done:   make(chan struct{}),
		}

		// 录屏
		if deps.SessionSvc != nil {
			hostName, hostAddr := "", ""
			if deps.HostName != nil {
				hostName, hostAddr = deps.HostName(hostID)
			}
			record, recErr := deps.SessionSvc.CreateSession(
				claims.UserID, claims.Username, hostID, hostName, hostAddr, sessionID,
			)
			if recErr == nil {
				ts.RecordID = record.ID
				ts.recorder = newSessionRecorder(deps.SessionSvc, record.ID)
			}
		}

		Sessions.Add(ts)
		defer func() {
			Sessions.Remove(sessionID)
			if ts.recorder != nil {
				ts.recorder.close()
				deps.SessionSvc.CloseSession(sessionID)
			}
		}()

		// 发送 session ID: id|{sessionId}
		sendProtoMsg(conn, "id", sessionID)
		// 发送已连接: co
		sendProtoMsg(conn, "co")

		// 从 SSH stdout → WebSocket
		go func() {
			buf := make([]byte, 8192)
			for {
				n, err := stdout.Read(buf)
				if err != nil {
					// 发送关闭: cl|code|msg
					sendProtoMsg(conn, "cl", "0", "连接已关闭")
					close(ts.done)
					return
				}
				if n > 0 {
					data := buf[:n]
					// SSH 输出: o|{body}
					sendProtoMsg(conn, "o", string(data))
					if ts.recorder != nil {
						ts.recorder.write(data)
					}
				}
			}
		}()

		// 从 WebSocket → SSH stdin
		for {
			_, msgBytes, err := conn.ReadMessage()
			if err != nil {
				return
			}

			msg := string(msgBytes)
			msgType, rest := splitProtoMsg(msg)

			switch msgType {
			case "i": // SSH 输入: i|command
				stdin.Write([]byte(rest))
			case "rs": // 修改大小: rs|width|height
				parts := strings.SplitN(rest, "|", 2)
				if len(parts) == 2 {
					w, _ := strconv.Atoi(parts[0])
					h, _ := strconv.Atoi(parts[1])
					if w > 0 && h > 0 {
						session.WindowChange(h, w)
					}
				}
			case "p": // ping → pong
				sendProtoMsg(conn, "p")
			case "cl": // 关闭
				return
			}
		}
	}
}

// sendProtoMsg 发送管道分隔协议消息: type|param1|param2...
func sendProtoMsg(conn *websocket.Conn, parts ...string) {
	conn.WriteMessage(websocket.TextMessage, []byte(strings.Join(parts, "|")))
}

// splitProtoMsg 分割协议消息的第一段: "type|rest" → ("type", "rest")
func splitProtoMsg(msg string) (string, string) {
	idx := strings.IndexByte(msg, '|')
	if idx < 0 {
		return msg, ""
	}
	return msg[:idx], msg[idx+1:]
}
