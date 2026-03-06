package service

import (
	"errors"

	"github.com/orion-visor/server/internal/model"
	"gorm.io/gorm"
)

type IdentityService struct {
	db *gorm.DB
}

func NewIdentityService(db *gorm.DB) *IdentityService {
	return &IdentityService{db: db}
}

func (s *IdentityService) List() ([]model.HostIdentity, error) {
	var identities []model.HostIdentity
	err := s.db.Order("id DESC").Find(&identities).Error
	return identities, err
}

func (s *IdentityService) GetByID(id int64) (*model.HostIdentity, error) {
	var identity model.HostIdentity
	if err := s.db.First(&identity, id).Error; err != nil {
		return nil, err
	}
	return &identity, nil
}

func (s *IdentityService) Create(req *model.HostIdentityCreateRequest) (*model.HostIdentity, error) {
	identity := model.HostIdentity{
		Name:       req.Name,
		Type:       req.Type,
		Username:   req.Username,
		Password:   req.Password,
		KeyText:    req.KeyText,
		Passphrase: req.Passphrase,
		Remark:     req.Remark,
	}
	if err := s.db.Create(&identity).Error; err != nil {
		return nil, err
	}
	return &identity, nil
}

func (s *IdentityService) Update(id int64, req *model.HostIdentityUpdateRequest) error {
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Username != "" {
		updates["username"] = req.Username
	}
	if req.Password != "" {
		updates["password"] = req.Password
	}
	if req.KeyText != "" {
		updates["key_text"] = req.KeyText
	}
	if req.Passphrase != "" {
		updates["passphrase"] = req.Passphrase
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}
	if len(updates) == 0 {
		return errors.New("没有要更新的字段")
	}
	return s.db.Model(&model.HostIdentity{}).Where("id = ?", id).Updates(updates).Error
}

func (s *IdentityService) Delete(id int64) error {
	return s.db.Delete(&model.HostIdentity{}, id).Error
}
