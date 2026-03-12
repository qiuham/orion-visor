package service

import (
	"time"

	"github.com/orion-visor/server/internal/model"
	"gorm.io/gorm"
)

type NotificationService struct {
	db *gorm.DB
}

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{db: db}
}

// List 查询用户通知（含广播通知）
func (s *NotificationService) List(userID int64, status *int8, page, pageSize int) ([]model.Notification, int64, error) {
	var list []model.Notification
	var total int64

	q := s.db.Model(&model.Notification{}).
		Where("user_id = ? OR user_id = 0", userID)
	if status != nil {
		q = q.Where("status = ?", *status)
	}
	q.Count(&total)

	err := q.Order("create_time DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&list).Error
	return list, total, err
}

// Create 创建通知
func (s *NotificationService) Create(req *model.NotificationCreateRequest) (*model.Notification, error) {
	n := &model.Notification{
		UserID:  req.UserID,
		Title:   req.Title,
		Content: req.Content,
		Type:    req.Type,
		Status:  0,
	}
	err := s.db.Create(n).Error
	return n, err
}

// MarkRead 标记已读
func (s *NotificationService) MarkRead(id, userID int64) error {
	now := time.Now()
	return s.db.Model(&model.Notification{}).
		Where("id = ? AND (user_id = ? OR user_id = 0)", id, userID).
		Updates(map[string]interface{}{
			"status":    1,
			"read_time": now,
		}).Error
}

// MarkAllRead 标记全部已读
func (s *NotificationService) MarkAllRead(userID int64) error {
	now := time.Now()
	return s.db.Model(&model.Notification{}).
		Where("(user_id = ? OR user_id = 0) AND status = 0", userID).
		Updates(map[string]interface{}{
			"status":    1,
			"read_time": now,
		}).Error
}

// CountUnread 未读数量
func (s *NotificationService) CountUnread(userID int64) int64 {
	var count int64
	s.db.Model(&model.Notification{}).
		Where("(user_id = ? OR user_id = 0) AND status = 0", userID).
		Count(&count)
	return count
}

// Delete 删除通知
func (s *NotificationService) Delete(id int64) error {
	return s.db.Delete(&model.Notification{}, id).Error
}
