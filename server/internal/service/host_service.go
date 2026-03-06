package service

import (
	"errors"

	"github.com/orion-visor/server/internal/model"
	"gorm.io/gorm"
)

type HostService struct {
	db *gorm.DB
}

func NewHostService(db *gorm.DB) *HostService {
	return &HostService{db: db}
}

func (s *HostService) List(req *model.HostListRequest) ([]model.Host, int64, error) {
	var hosts []model.Host
	var total int64

	q := s.db.Model(&model.Host{})
	if req.Name != "" {
		q = q.Where("name LIKE ?", "%"+req.Name+"%")
	}
	if req.Type != "" {
		q = q.Where("type = ?", req.Type)
	}
	if req.Status != nil {
		q = q.Where("status = ?", *req.Status)
	}
	q.Count(&total)

	offset := (req.Page - 1) * req.PageSize
	if err := q.Order("id DESC").Offset(offset).Limit(req.PageSize).Find(&hosts).Error; err != nil {
		return nil, 0, err
	}
	return hosts, total, nil
}

func (s *HostService) GetByID(id int64) (*model.Host, error) {
	var host model.Host
	if err := s.db.First(&host, id).Error; err != nil {
		return nil, err
	}
	return &host, nil
}

func (s *HostService) Create(req *model.HostCreateRequest, creator string) (*model.Host, error) {
	host := model.Host{
		Type:    req.Type,
		Name:    req.Name,
		Code:    req.Code,
		Address: req.Address,
		Port:    req.Port,
		Status:  1,
		Tags:    req.Tags,
		Remark:  req.Remark,
		Creator: creator,
	}
	if err := s.db.Create(&host).Error; err != nil {
		return nil, err
	}
	return &host, nil
}

func (s *HostService) Update(id int64, req *model.HostUpdateRequest) error {
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Address != "" {
		updates["address"] = req.Address
	}
	if req.Port > 0 {
		updates["port"] = req.Port
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Tags != "" {
		updates["tags"] = req.Tags
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}
	if len(updates) == 0 {
		return errors.New("no fields to update")
	}
	return s.db.Model(&model.Host{}).Where("id = ?", id).Updates(updates).Error
}

func (s *HostService) Delete(id int64) error {
	return s.db.Delete(&model.Host{}, id).Error
}

// GetIdentity returns the host identity (SSH credentials)
func (s *HostService) GetIdentity(id int64) (*model.HostIdentity, error) {
	var identity model.HostIdentity
	if err := s.db.First(&identity, id).Error; err != nil {
		return nil, err
	}
	return &identity, nil
}
