package model

import "time"

// Role 系统角色
type Role struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Name       string    `json:"name" gorm:"size:32;uniqueIndex"`
	Code       string    `json:"code" gorm:"size:32;uniqueIndex"`
	Status     int8      `json:"status" gorm:"default:1"` // 1=启用 2=停用
	Sort       int       `json:"sort" gorm:"default:0"`
	Remark     string    `json:"remark" gorm:"size:512"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (Role) TableName() string {
	return "system_role"
}

// UserRole 用户-角色关联
type UserRole struct {
	ID     int64 `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID int64 `json:"userId" gorm:"index"`
	RoleID int64 `json:"roleId" gorm:"index"`
}

func (UserRole) TableName() string {
	return "system_user_role"
}

// Menu 系统菜单/权限点
type Menu struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	ParentID   int64     `json:"parentId" gorm:"default:0;index"`
	Name       string    `json:"name" gorm:"size:64"`
	Permission string    `json:"permission" gorm:"size:128;index"` // e.g. "host:create"
	Type       int8      `json:"type"`                              // 1=目录 2=菜单 3=按钮
	Sort       int       `json:"sort" gorm:"default:0"`
	Status     int8      `json:"status" gorm:"default:1"`
	Icon       string    `json:"icon" gorm:"size:64"`
	Path       string    `json:"path" gorm:"size:256"`
	Component  string    `json:"component" gorm:"size:256"`
	Visible    int8      `json:"visible" gorm:"default:1"` // 1=显示 2=隐藏
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (Menu) TableName() string {
	return "system_menu"
}

// RoleMenu 角色-菜单关联
type RoleMenu struct {
	ID     int64 `json:"id" gorm:"primaryKey;autoIncrement"`
	RoleID int64 `json:"roleId" gorm:"index"`
	MenuID int64 `json:"menuId" gorm:"index"`
}

func (RoleMenu) TableName() string {
	return "system_role_menu"
}

// Request/Response types

type RoleCreateRequest struct {
	Name   string `json:"name" binding:"required"`
	Code   string `json:"code" binding:"required"`
	Sort   int    `json:"sort"`
	Remark string `json:"remark"`
}

type RoleUpdateRequest struct {
	Name   string `json:"name"`
	Status *int8  `json:"status"`
	Sort   int    `json:"sort"`
	Remark string `json:"remark"`
}

type RoleMenuUpdateRequest struct {
	MenuIDs []int64 `json:"menuIds" binding:"required"`
}

type UserRoleUpdateRequest struct {
	RoleIDs []int64 `json:"roleIds" binding:"required"`
}
