package service

import (
	"github.com/orion-visor/server/internal/model"
	"gorm.io/gorm"
)

type SystemService struct {
	db *gorm.DB
}

func NewSystemService(db *gorm.DB) *SystemService {
	return &SystemService{db: db}
}

// --- 系统参数 ---

func (s *SystemService) GetSettings(settingType string) ([]model.SystemSetting, error) {
	var settings []model.SystemSetting
	q := s.db.Model(&model.SystemSetting{})
	if settingType != "" {
		q = q.Where("type = ?", settingType)
	}
	err := q.Order("id ASC").Find(&settings).Error
	return settings, err
}

func (s *SystemService) GetSetting(item string) (*model.SystemSetting, error) {
	var setting model.SystemSetting
	if err := s.db.Where("item = ?", item).First(&setting).Error; err != nil {
		return nil, err
	}
	return &setting, nil
}

func (s *SystemService) UpdateSetting(item, value string) error {
	return s.db.Model(&model.SystemSetting{}).Where("item = ?", item).Update("value", value).Error
}

// --- 字典 ---

func (s *SystemService) ListDictKeys() ([]model.DictKey, error) {
	var keys []model.DictKey
	err := s.db.Order("id ASC").Find(&keys).Error
	return keys, err
}

func (s *SystemService) CreateDictKey(req *model.DictKeyCreateRequest) (*model.DictKey, error) {
	key := model.DictKey{
		KeyName: req.KeyName,
		Remark:  req.Remark,
	}
	if err := s.db.Create(&key).Error; err != nil {
		return nil, err
	}
	return &key, nil
}

func (s *SystemService) DeleteDictKey(id int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var key model.DictKey
		if err := tx.First(&key, id).Error; err != nil {
			return err
		}
		tx.Where("key_name = ?", key.KeyName).Delete(&model.DictValue{})
		return tx.Delete(&model.DictKey{}, id).Error
	})
}

func (s *SystemService) ListDictValues(keyName string) ([]model.DictValue, error) {
	var values []model.DictValue
	err := s.db.Where("key_name = ?", keyName).Order("sort ASC, id ASC").Find(&values).Error
	return values, err
}

func (s *SystemService) CreateDictValue(req *model.DictValueCreateRequest) (*model.DictValue, error) {
	// 查找 key ID
	var key model.DictKey
	if err := s.db.Where("key_name = ?", req.KeyName).First(&key).Error; err != nil {
		return nil, err
	}
	value := model.DictValue{
		KeyID:   key.ID,
		KeyName: req.KeyName,
		Value:   req.Value,
		Label:   req.Label,
		Extra:   req.Extra,
		Sort:    req.Sort,
	}
	if err := s.db.Create(&value).Error; err != nil {
		return nil, err
	}
	return &value, nil
}

func (s *SystemService) DeleteDictValue(id int64) error {
	return s.db.Delete(&model.DictValue{}, id).Error
}
