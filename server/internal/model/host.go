package model

import "time"

// Host maps to asset_host table
type Host struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Type       string    `json:"type" gorm:"size:12"` // SSH, RDP, VNC
	Name       string    `json:"name" gorm:"size:64;index"`
	Code       string    `json:"code" gorm:"size:64;uniqueIndex"`
	Address    string    `json:"address" gorm:"size:128"`
	Port       int       `json:"port"`
	Status     int8      `json:"status" gorm:"default:1"` // 1=enabled 2=disabled
	Tags       string    `json:"tags" gorm:"size:512"`
	Remark     string    `json:"remark" gorm:"size:512"`
	IdentityID int64    `json:"identityId" gorm:"default:0"` // 关联凭证 ID
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
	Creator    string    `json:"creator" gorm:"size:64"`
}

func (Host) TableName() string {
	return "asset_host"
}

// HostIdentity stores SSH credentials
type HostIdentity struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Name       string    `json:"name" gorm:"size:64"`
	Type       string    `json:"type" gorm:"size:12"` // password, key
	Username   string    `json:"username" gorm:"size:128"`
	Password   string    `json:"-" gorm:"size:512"`
	KeyText    string    `json:"-" gorm:"column:key_text;type:text"`
	Passphrase string    `json:"-" gorm:"size:512"`
	Remark     string    `json:"remark" gorm:"size:512"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (HostIdentity) TableName() string {
	return "asset_host_identity"
}

// HostConfig stores per-host connection config
type HostConfig struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	HostID     int64     `json:"hostId" gorm:"index"`
	Type       string    `json:"type" gorm:"size:12"` // SSH, RDP, VNC
	Config     string    `json:"config" gorm:"type:json"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (HostConfig) TableName() string {
	return "asset_host_config"
}

// Request/Response types
type HostListRequest struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"pageSize,default=20"`
	Name     string `form:"name"`
	Type     string `form:"type"`
	Status   *int8  `form:"status"`
	GroupID  *int64 `form:"groupId"`
}

type HostCreateRequest struct {
	Type    string `json:"type" binding:"required"`
	Name    string `json:"name" binding:"required"`
	Code    string `json:"code" binding:"required"`
	Address string `json:"address" binding:"required"`
	Port    int    `json:"port" binding:"required"`
	Tags    string `json:"tags"`
	Remark  string `json:"remark"`
}

type HostUpdateRequest struct {
	Name       string `json:"name"`
	Address    string `json:"address"`
	Port       int    `json:"port"`
	Status     *int8  `json:"status"`
	Tags       string `json:"tags"`
	Remark     string `json:"remark"`
	IdentityID *int64 `json:"identityId"`
}

// HostIdentity request types

type HostIdentityCreateRequest struct {
	Name       string `json:"name" binding:"required"`
	Type       string `json:"type" binding:"required"` // password, key
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password"`
	KeyText    string `json:"keyText"`
	Passphrase string `json:"passphrase"`
	Remark     string `json:"remark"`
}

type HostIdentityUpdateRequest struct {
	Name       string `json:"name"`
	Username   string `json:"username"`
	Password   string `json:"password"`
	KeyText    string `json:"keyText"`
	Passphrase string `json:"passphrase"`
	Remark     string `json:"remark"`
}
