package service

import (
	"time"

	"github.com/orion-visor/server/internal/model"
	"gorm.io/gorm"
)

type AuditService struct {
	db *gorm.DB
}

func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{db: db}
}

// RecordOperation 记录操作日志
func (s *AuditService) RecordOperation(log *model.OperationLog) {
	s.db.Create(log)
}

// ListOperationLogs 查询操作日志
func (s *AuditService) ListOperationLogs(req *model.OperationLogListRequest) ([]model.OperationLog, int64, error) {
	var logs []model.OperationLog
	var total int64

	q := s.db.Model(&model.OperationLog{})
	if req.UserID != nil {
		q = q.Where("user_id = ?", *req.UserID)
	}
	if req.Module != "" {
		q = q.Where("module = ?", req.Module)
	}
	if req.Type != "" {
		q = q.Where("type = ?", req.Type)
	}
	if req.Result != nil {
		q = q.Where("result = ?", *req.Result)
	}
	q.Count(&total)

	offset := (req.Page - 1) * req.PageSize
	err := q.Order("id DESC").Offset(offset).Limit(req.PageSize).Find(&logs).Error
	return logs, total, err
}

// RecordConnect 记录终端连接日志
func (s *AuditService) RecordConnect(log *model.ConnectLog) error {
	return s.db.Create(log).Error
}

// CloseConnect 关闭连接日志
func (s *AuditService) CloseConnect(token string) {
	now := time.Now()
	s.db.Model(&model.ConnectLog{}).Where("token = ?", token).
		Updates(map[string]interface{}{"status": 2, "end_time": &now})
}

// ListConnectLogs 查询连接日志
func (s *AuditService) ListConnectLogs(req *model.ConnectLogListRequest) ([]model.ConnectLog, int64, error) {
	var logs []model.ConnectLog
	var total int64

	q := s.db.Model(&model.ConnectLog{})
	if req.UserID != nil {
		q = q.Where("user_id = ?", *req.UserID)
	}
	if req.HostID != nil {
		q = q.Where("host_id = ?", *req.HostID)
	}
	if req.Type != "" {
		q = q.Where("type = ?", req.Type)
	}
	if req.Status != nil {
		q = q.Where("status = ?", *req.Status)
	}
	q.Count(&total)

	offset := (req.Page - 1) * req.PageSize
	err := q.Order("id DESC").Offset(offset).Limit(req.PageSize).Find(&logs).Error
	return logs, total, err
}
