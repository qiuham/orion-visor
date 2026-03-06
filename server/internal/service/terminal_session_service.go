package service

import (
	"time"

	"github.com/orion-visor/server/internal/model"
	"gorm.io/gorm"
)

type TerminalSessionService struct {
	db *gorm.DB
}

func NewTerminalSessionService(db *gorm.DB) *TerminalSessionService {
	return &TerminalSessionService{db: db}
}

// CreateSession 创建终端录屏会话
func (s *TerminalSessionService) CreateSession(userID int64, username string, hostID int64, hostName, hostAddr, token string) (*model.TerminalSession, error) {
	session := model.TerminalSession{
		UserID:   userID,
		Username: username,
		HostID:   hostID,
		HostName: hostName,
		HostAddr: hostAddr,
		Token:    token,
		Status:   1,
	}
	if err := s.db.Create(&session).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

// AppendData 追加录屏数据
func (s *TerminalSessionService) AppendData(sessionID int64, sequence int, data string) {
	s.db.Create(&model.TerminalSessionData{
		SessionID: sessionID,
		Sequence:  sequence,
		Data:      data,
	})
}

// CloseSession 关闭录屏会话
func (s *TerminalSessionService) CloseSession(token string) {
	now := time.Now()
	s.db.Model(&model.TerminalSession{}).Where("token = ?", token).Updates(map[string]interface{}{
		"status":   2,
		"end_time": &now,
	})
}

// GetSession 获取会话详情
func (s *TerminalSessionService) GetSession(id int64) (*model.TerminalSession, error) {
	var session model.TerminalSession
	if err := s.db.First(&session, id).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

// GetSessionData 获取录屏数据
func (s *TerminalSessionService) GetSessionData(sessionID int64) ([]model.TerminalSessionData, error) {
	var data []model.TerminalSessionData
	err := s.db.Where("session_id = ?", sessionID).Order("sequence ASC").Find(&data).Error
	return data, err
}

// ListSessions 会话列表
func (s *TerminalSessionService) ListSessions(req *model.TerminalSessionListRequest) ([]model.TerminalSession, int64, error) {
	var sessions []model.TerminalSession
	var total int64
	q := s.db.Model(&model.TerminalSession{})
	if req.UserID != nil {
		q = q.Where("user_id = ?", *req.UserID)
	}
	if req.HostID != nil {
		q = q.Where("host_id = ?", *req.HostID)
	}
	if req.Status != nil {
		q = q.Where("status = ?", *req.Status)
	}
	q.Count(&total)
	offset := (req.Page - 1) * req.PageSize
	err := q.Order("id DESC").Offset(offset).Limit(req.PageSize).Find(&sessions).Error
	return sessions, total, err
}

// DeleteSession 删除会话及数据
func (s *TerminalSessionService) DeleteSession(id int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		tx.Where("session_id = ?", id).Delete(&model.TerminalSessionData{})
		return tx.Delete(&model.TerminalSession{}, id).Error
	})
}
