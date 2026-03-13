package service

import (
	"github.com/ops-platform/server/internal/model"
	"gorm.io/gorm"
)

type GrantService struct {
	db *gorm.DB
}

func NewGrantService(db *gorm.DB) *GrantService {
	return &GrantService{db: db}
}

// GetGrantedHostIDs 获取某个用户/角色已授权的主机 ID 列表
func (s *GrantService) GetGrantedHostIDs(grantType string, grantID int64) ([]int64, error) {
	var hostIDs []int64
	err := s.db.Model(&model.AssetGrant{}).
		Where("grant_type = ? AND grant_id = ?", grantType, grantID).
		Pluck("host_id", &hostIDs).Error
	return hostIDs, err
}

// UpdateGrant 更新授权关系（全量替换）
func (s *GrantService) UpdateGrant(req *model.AssetGrantUpdateRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 删除旧的授权
		if err := tx.Where("grant_type = ? AND grant_id = ?", req.GrantType, req.GrantID).
			Delete(&model.AssetGrant{}).Error; err != nil {
			return err
		}
		// 批量插入新的授权
		if len(req.HostIDs) > 0 {
			grants := make([]model.AssetGrant, len(req.HostIDs))
			for i, hid := range req.HostIDs {
				grants[i] = model.AssetGrant{
					GrantType: req.GrantType,
					GrantID:   req.GrantID,
					HostID:    hid,
				}
			}
			if err := tx.Create(&grants).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// GetUserAccessibleHostIDs 获取用户可访问的全部主机 ID（含直接授权 + 通过角色授权）
func (s *GrantService) GetUserAccessibleHostIDs(userID int64) ([]int64, error) {
	var hostIDs []int64

	// 直接授权给用户的
	var directIDs []int64
	s.db.Model(&model.AssetGrant{}).
		Where("grant_type = 'user' AND grant_id = ?", userID).
		Pluck("host_id", &directIDs)

	// 通过角色授权的
	var roleIDs []int64
	s.db.Model(&model.UserRole{}).Where("user_id = ?", userID).Pluck("role_id", &roleIDs)

	var roleHostIDs []int64
	if len(roleIDs) > 0 {
		s.db.Model(&model.AssetGrant{}).
			Where("grant_type = 'role' AND grant_id IN ?", roleIDs).
			Pluck("host_id", &roleHostIDs)
	}

	// 合并去重
	seen := make(map[int64]bool)
	for _, id := range directIDs {
		if !seen[id] {
			hostIDs = append(hostIDs, id)
			seen[id] = true
		}
	}
	for _, id := range roleHostIDs {
		if !seen[id] {
			hostIDs = append(hostIDs, id)
			seen[id] = true
		}
	}

	return hostIDs, nil
}
