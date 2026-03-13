package service

import (
	"github.com/ops-platform/server/internal/model"
	"gorm.io/gorm"
)

type HostGroupService struct {
	db *gorm.DB
}

func NewHostGroupService(db *gorm.DB) *HostGroupService {
	return &HostGroupService{db: db}
}

func (s *HostGroupService) List() ([]model.HostGroup, error) {
	var groups []model.HostGroup
	err := s.db.Order("sort ASC, id ASC").Find(&groups).Error
	return groups, err
}

func (s *HostGroupService) Create(req *model.HostGroupCreateRequest) (*model.HostGroup, error) {
	group := model.HostGroup{
		ParentID: req.ParentID,
		Name:     req.Name,
		Sort:     req.Sort,
	}
	if err := s.db.Create(&group).Error; err != nil {
		return nil, err
	}
	return &group, nil
}

func (s *HostGroupService) Update(id int64, req *model.HostGroupUpdateRequest) error {
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Sort > 0 {
		updates["sort"] = req.Sort
	}
	return s.db.Model(&model.HostGroup{}).Where("id = ?", id).Updates(updates).Error
}

func (s *HostGroupService) Delete(id int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		tx.Where("group_id = ?", id).Delete(&model.HostGroupRel{})
		// 将子分组移到根级
		tx.Model(&model.HostGroup{}).Where("parent_id = ?", id).Update("parent_id", 0)
		return tx.Delete(&model.HostGroup{}, id).Error
	})
}

// GetGroupHosts 获取分组下的主机 ID 列表
func (s *HostGroupService) GetGroupHosts(groupID int64) ([]int64, error) {
	var hostIDs []int64
	err := s.db.Model(&model.HostGroupRel{}).Where("group_id = ?", groupID).Pluck("host_id", &hostIDs).Error
	return hostIDs, err
}

// UpdateGroupHosts 更新分组下的主机
func (s *HostGroupService) UpdateGroupHosts(groupID int64, hostIDs []int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		tx.Where("group_id = ?", groupID).Delete(&model.HostGroupRel{})
		for _, hostID := range hostIDs {
			if err := tx.Create(&model.HostGroupRel{GroupID: groupID, HostID: hostID}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
