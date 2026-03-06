package model

import "time"

// User maps to system_user table (reuse existing orion-visor schema)
type User struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Username   string    `json:"username" gorm:"size:32;uniqueIndex"`
	Password   string    `json:"-" gorm:"size:128"`
	Nickname   string    `json:"nickname" gorm:"size:64"`
	Avatar     string    `json:"avatar" gorm:"size:512"`
	Mobile     string    `json:"mobile" gorm:"size:15"`
	Email      string    `json:"email" gorm:"size:64"`
	Status     int8      `json:"status" gorm:"default:1"` // 1=enabled 2=disabled
	LastLogin  *time.Time `json:"lastLogin"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (User) TableName() string {
	return "system_user"
}

// LoginRequest is the login request body
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse is the login response body
type LoginResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}
