package model

import "time"

// AssetGrant 资产授权 - 将主机授权给用户或角色
type AssetGrant struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	GrantType  string    `json:"grantType" gorm:"size:12;index"` // user, role
	GrantID    int64     `json:"grantId" gorm:"index"`           // 用户ID 或 角色ID
	HostID     int64     `json:"hostId" gorm:"index"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
}

func (AssetGrant) TableName() string {
	return "asset_grant"
}

// Tag 标签
type Tag struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Name       string    `json:"name" gorm:"size:64;uniqueIndex"`
	Color      string    `json:"color" gorm:"size:16"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
}

func (Tag) TableName() string {
	return "tag"
}

// Notification 系统通知/消息
type Notification struct {
	ID         int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID     int64      `json:"userId" gorm:"index"`   // 0=全局广播
	Title      string     `json:"title" gorm:"size:128"`
	Content    string     `json:"content" gorm:"type:text"`
	Type       string     `json:"type" gorm:"size:16;index"` // info, warning, error, success
	Status     int8       `json:"status" gorm:"default:0"`   // 0=未读 1=已读
	ReadTime   *time.Time `json:"readTime"`
	CreateTime time.Time  `json:"createTime" gorm:"autoCreateTime"`
}

func (Notification) TableName() string {
	return "system_notification"
}

// Favorite 用户收藏
type Favorite struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID     int64     `json:"userId" gorm:"index"`
	Type       string    `json:"type" gorm:"size:16;index"` // host, snippet
	RelID      int64     `json:"relId"`                     // 关联对象 ID
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
}

func (Favorite) TableName() string {
	return "user_favorite"
}

// --- Request types ---

type AssetGrantUpdateRequest struct {
	GrantType string  `json:"grantType" binding:"required"` // user, role
	GrantID   int64   `json:"grantId" binding:"required"`
	HostIDs   []int64 `json:"hostIds" binding:"required"`
}

type TagCreateRequest struct {
	Name  string `json:"name" binding:"required"`
	Color string `json:"color"`
}

type NotificationCreateRequest struct {
	UserID  int64  `json:"userId"`
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
	Type    string `json:"type" binding:"required"`
}

type FavoriteRequest struct {
	Type  string `json:"type" binding:"required"`
	RelID int64  `json:"relId" binding:"required"`
}
