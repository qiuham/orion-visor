package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	internalssh "github.com/orion-visor/server/internal/ssh"
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
	ID      string
	UserID  int64
	HostID  int64
	Client  *internalssh.Client
	WS      *websocket.Conn
	done    chan struct{}
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

// HandleTerminalWS handles WebSocket connections for SSH terminal
func HandleTerminalWS(getSSHConfig func(hostID int64) (*internalssh.ConnectConfig, error)) gin.HandlerFunc {
	return func(c *gin.Context) {
		hostIDStr := c.Param("hostId")
		hostID, err := strconv.ParseInt(hostIDStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid hostId"})
			return
		}

		userID, _ := c.Get("userId")

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("ws upgrade error: %v", err)
			return
		}
		defer conn.Close()

		// Get SSH config for this host
		sshCfg, err := getSSHConfig(hostID)
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
		sessionID := hostIDStr + "-" + strconv.FormatInt(userID.(int64), 10)
		ts := &TerminalSession{
			ID:     sessionID,
			UserID: userID.(int64),
			HostID: hostID,
			Client: client,
			WS:     conn,
			done:   make(chan struct{}),
		}
		Sessions.Add(ts)
		defer Sessions.Remove(sessionID)

		// Read SSH stdout → WebSocket
		go func() {
			buf := make([]byte, 8192)
			for {
				n, err := stdout.Read(buf)
				if err != nil {
					close(ts.done)
					return
				}
				if n > 0 {
					conn.WriteMessage(websocket.TextMessage, buf[:n])
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
