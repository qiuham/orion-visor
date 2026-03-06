package monitor

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	internalssh "github.com/orion-visor/server/internal/ssh"
)

// MonitorSession 管理一个主机的实时监控会话
type MonitorSession struct {
	HostID   int64
	Client   *internalssh.Client
	WS       *websocket.Conn
	Interval time.Duration
	done     chan struct{}
	history  []Metrics // 内存中保留最近 N 条
	maxHist  int
	mu       sync.Mutex
}

// MonitorManager 管理所有活跃的监控会话
type MonitorManager struct {
	mu       sync.RWMutex
	sessions map[int64]*MonitorSession // hostID -> session
}

var Manager = &MonitorManager{
	sessions: make(map[int64]*MonitorSession),
}

// StartSession 启动一个监控会话
func (m *MonitorManager) StartSession(hostID int64, client *internalssh.Client, ws *websocket.Conn, interval time.Duration, retain int) {
	// 如果已有会话，先停掉
	m.StopSession(hostID)

	maxHist := retain / int(interval.Seconds())
	if maxHist <= 0 {
		maxHist = 100
	}

	session := &MonitorSession{
		HostID:   hostID,
		Client:   client,
		WS:       ws,
		Interval: interval,
		done:     make(chan struct{}),
		maxHist:  maxHist,
	}

	m.mu.Lock()
	m.sessions[hostID] = session
	m.mu.Unlock()

	go session.run()
}

// StopSession 停止监控会话
func (m *MonitorManager) StopSession(hostID int64) {
	m.mu.Lock()
	if s, ok := m.sessions[hostID]; ok {
		close(s.done)
		delete(m.sessions, hostID)
	}
	m.mu.Unlock()
}

func (s *MonitorSession) run() {
	ticker := time.NewTicker(s.Interval)
	defer ticker.Stop()

	// 首次立即采集
	s.collectAndSend()

	for {
		select {
		case <-s.done:
			return
		case <-ticker.C:
			s.collectAndSend()
		}
	}
}

func (s *MonitorSession) collectAndSend() {
	metrics, err := Collect(s.Client)
	if err != nil {
		log.Printf("采集指标失败 hostID=%d: %v", s.HostID, err)
		return
	}

	// 存入内存历史
	s.mu.Lock()
	s.history = append(s.history, *metrics)
	if len(s.history) > s.maxHist {
		s.history = s.history[len(s.history)-s.maxHist:]
	}
	s.mu.Unlock()

	// 通过 WebSocket 推送
	data, _ := json.Marshal(map[string]interface{}{
		"type": "metrics",
		"data": metrics,
	})
	if err := s.WS.WriteMessage(websocket.TextMessage, data); err != nil {
		log.Printf("推送指标失败 hostID=%d: %v", s.HostID, err)
	}
}

// GetHistory 获取历史指标（用于前端初始化图表）
func (s *MonitorSession) GetHistory() []Metrics {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := make([]Metrics, len(s.history))
	copy(cp, s.history)
	return cp
}
