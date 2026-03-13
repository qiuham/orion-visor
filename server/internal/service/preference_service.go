package service

import (
	"github.com/ops-platform/server/internal/model"
	"gorm.io/gorm"
)

type PreferenceService struct {
	db *gorm.DB
}

func NewPreferenceService(db *gorm.DB) *PreferenceService {
	return &PreferenceService{db: db}
}

// GetPreferences 获取用户偏好列表
func (s *PreferenceService) GetPreferences(userID int64, prefType string) ([]model.UserPreference, error) {
	var prefs []model.UserPreference
	q := s.db.Where("user_id = ?", userID)
	if prefType != "" {
		q = q.Where("type = ?", prefType)
	}
	err := q.Find(&prefs).Error
	return prefs, err
}

// SetPreference 设置单个偏好（upsert）
func (s *PreferenceService) SetPreference(userID int64, prefType, item, value string) error {
	var existing model.UserPreference
	err := s.db.Where("user_id = ? AND type = ? AND item = ?", userID, prefType, item).
		First(&existing).Error
	if err == gorm.ErrRecordNotFound {
		return s.db.Create(&model.UserPreference{
			UserID: userID,
			Type:   prefType,
			Item:   item,
			Value:  value,
		}).Error
	}
	if err != nil {
		return err
	}
	return s.db.Model(&existing).Update("value", value).Error
}

// DeletePreference 删除偏好
func (s *PreferenceService) DeletePreference(userID int64, prefType, item string) error {
	return s.db.Where("user_id = ? AND type = ? AND item = ?", userID, prefType, item).
		Delete(&model.UserPreference{}).Error
}

// --- 收藏 ---

// ListFavorites 获取用户收藏
func (s *PreferenceService) ListFavorites(userID int64, favType string) ([]model.Favorite, error) {
	var favs []model.Favorite
	q := s.db.Where("user_id = ?", userID)
	if favType != "" {
		q = q.Where("type = ?", favType)
	}
	err := q.Order("create_time DESC").Find(&favs).Error
	return favs, err
}

// AddFavorite 添加收藏
func (s *PreferenceService) AddFavorite(userID int64, req *model.FavoriteRequest) error {
	// 检查是否已收藏
	var count int64
	s.db.Model(&model.Favorite{}).
		Where("user_id = ? AND type = ? AND rel_id = ?", userID, req.Type, req.RelID).
		Count(&count)
	if count > 0 {
		return nil // 已收藏，幂等
	}
	return s.db.Create(&model.Favorite{
		UserID: userID,
		Type:   req.Type,
		RelID:  req.RelID,
	}).Error
}

// RemoveFavorite 移除收藏
func (s *PreferenceService) RemoveFavorite(userID int64, favType string, relID int64) error {
	return s.db.Where("user_id = ? AND type = ? AND rel_id = ?", userID, favType, relID).
		Delete(&model.Favorite{}).Error
}
