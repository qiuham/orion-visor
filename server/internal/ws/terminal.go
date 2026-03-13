package ws

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/ops-platform/server/internal/service"
	internalssh "github.com/ops-platform/server/internal/ssh"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// TerminalMessage is the WebSocket protocol message
type TerminalMessage struct {
	Type string `json:"type"` // input, resize, ping, close
	Data string `json:"data,omitempty"`
	Cols int    `json:"cols,omitempty"`
	Rows int    `json:"rows,omitempty"`
}

// SessionManager tracks active terminal sessions
type SessionManager struct {
	mu       sync.RWMutex
	sessions map[string]*TerminalSession
}

type TerminalSession struct {
	ID        string
	UserID    int64
	HostID    int64
	Client    *internalssh.Client
	WS        *websocket.Conn
	done      chan struct{}
	// 录屏相关
	RecordID  int64
	recorder  *sessionRecorder
}

// sessionRecorder 录屏数据缓冲
type sessionRecorder struct {
	sessionSvc *service.TerminalSessionService
	sessionID  int64
	sequence   int
	buf        strings.Builder
	mu         sync.Mutex
	flushTimer *time.Timer
}

func newSessionRecorder(sessionSvc *service.TerminalSessionService, sessionID int64) *sessionRecorder {
	r := &sessionRecorder{
		sessionSvc: sessionSvc,
		sessionID:  sessionID,
	}
	r.flushTimer = time.AfterFunc(2*time.Second, r.flush)
	return r
}

func (r *sessionRecorder) write(data []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()
	// 按 asciicast 格式记录: [时间, "o", 数据]
	entry := fmt.Sprintf("[%d,\"o\",%q]\n", time.Now().UnixMilli(), base64.StdEncoding.EncodeToString(data))
	r.buf.WriteString(entry)
	// 每 64KB 刷新一次
	if r.buf.Len() > 64*1024 {
		r.flushLocked()
	}
}

func (r *sessionRecorder) flush() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.flushLocked()
}

func (r *sessionRecorder) flushLocked() {
	if r.buf.Len() == 0 {
		return
	}
	r.sequence++
	r.sessionSvc.AppendData(r.sessionID, r.sequence, r.buf.String())
	r.buf.Reset()
	r.flushTimer.Reset(2 * time.Second)
}

func (r *sessionRecorder) close() {
	r.flushTimer.Stop()
	r.flush()
}

var Sessions = &SessionManager{
	sessions: make(map[string]*TerminalSession),
}

func (m *SessionManager) Add(s *TerminalSession) {
	m.mu.Lock()
	m.sessions[s.ID] = s
	m.mu.Unlock()
}

func (m *SessionManager) Remove(id string) {
	m.mu.Lock()
	delete(m.sessions, id)
	m.mu.Unlock()
}

func (m *SessionManager) Get(id string) *TerminalSession {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.sessions[id]
}

// Count 返回活跃会话数
func (m *SessionManager) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.sessions)
}

// TerminalDeps 终端所需的依赖
type TerminalDeps struct {
	GetSSHConfig func(hostID int64) (*internalssh.ConnectConfig, error)
	SessionSvc   *service.TerminalSessionService
	HostName     func(hostID int64) (string, string) // name, addr
}

// HandleTerminalWS handles WebSocket connections for SSH terminal with recording
func HandleTerminalWS(deps *TerminalDeps) gin.HandlerFunc {
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

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("ws upgrade error: %v", err)
			return
		}
		defer conn.Close()

		// Get SSH config for this host
		sshCfg, err := deps.GetSSHConfig(hostID)
		if err != nil {
			writeWSError(conn, "failed to get host config: "+err.Error())
			return
		}

		// Connect via SSH
		client, err := internalssh.Connect(sshCfg)
		if err != nil {
			writeWSError(conn, "ssh connect failed: "+err.Error())
			return
		}
		defer client.Close()

		// Default terminal size
		cols, rows := 120, 30

		// Create shell session
		session, stdin, stdout, err := client.NewShell(cols, rows)
		if err != nil {
			writeWSError(conn, "shell error: "+err.Error())
			return
		}
		defer session.Close()

		// Track session
		sessionID := hostIDStr + "-" + strconv.FormatInt(userID.(int64), 10) + "-" + strconv.FormatInt(time.Now().UnixMilli(), 36)
		ts := &TerminalSession{
			ID:     sessionID,
			UserID: userID.(int64),
			HostID: hostID,
			Client: client,
			WS:     conn,
			done:   make(chan struct{}),
		}

		// 创建录屏会话
		if deps.SessionSvc != nil {
			hostName, hostAddr := "", ""
			if deps.HostName != nil {
				hostName, hostAddr = deps.HostName(hostID)
			}
			record, err := deps.SessionSvc.CreateSession(
				userID.(int64), usernameStr, hostID, hostName, hostAddr, sessionID,
			)
			if err == nil {
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

		// Read SSH stdout → WebSocket (with recording)
		go func() {
			buf := make([]byte, 8192)
			for {
				n, err := stdout.Read(buf)
				if err != nil {
					close(ts.done)
					return
				}
				if n > 0 {
					data := buf[:n]
					conn.WriteMessage(websocket.TextMessage, data)
					// 录屏
					if ts.recorder != nil {
						ts.recorder.write(data)
					}
				}
			}
		}()

		// Read WebSocket → SSH stdin
		for {
			_, msgBytes, err := conn.ReadMessage()
			if err != nil {
				return
			}
			var msg TerminalMessage
			if err := json.Unmarshal(msgBytes, &msg); err != nil {
				// Raw text input
				stdin.Write(msgBytes)
				continue
			}
			switch msg.Type {
			case "input":
				stdin.Write([]byte(msg.Data))
			case "resize":
				if msg.Cols > 0 && msg.Rows > 0 {
					session.WindowChange(msg.Rows, msg.Cols)
				}
			case "ping":
				conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"pong"}`))
			case "close":
				return
			}
		}
	}
}

func writeWSError(conn *websocket.Conn, msg string) {
	data, _ := json.Marshal(map[string]string{"type": "error", "data": msg})
	conn.WriteMessage(websocket.TextMessage, data)
}
