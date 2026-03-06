package model

import "time"

// HostGroup 主机分组
type HostGroup struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	ParentID   int64     `json:"parentId" gorm:"default:0;index"`
	Name       string    `json:"name" gorm:"size:64"`
	Sort       int       `json:"sort" gorm:"default:0"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (HostGroup) TableName() string {
	return "asset_host_group"
}

// HostGroupRel 主机-分组关联
type HostGroupRel struct {
	ID      int64 `json:"id" gorm:"primaryKey;autoIncrement"`
	GroupID int64 `json:"groupId" gorm:"index"`
	HostID  int64 `json:"hostId" gorm:"index"`
}

func (HostGroupRel) TableName() string {
	return "asset_host_group_rel"
}

type HostGroupCreateRequest struct {
	ParentID int64  `json:"parentId"`
	Name     string `json:"name" binding:"required"`
	Sort     int    `json:"sort"`
}

type HostGroupUpdateRequest struct {
	Name string `json:"name"`
	Sort int    `json:"sort"`
}

type HostGroupRelRequest struct {
	HostIDs []int64 `json:"hostIds" binding:"required"`
}
