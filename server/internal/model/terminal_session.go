package model

import "time"

// TerminalSession 终端会话录屏记录
type TerminalSession struct {
	ID         int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID     int64      `json:"userId" gorm:"index"`
	Username   string     `json:"username" gorm:"size:32"`
	HostID     int64      `json:"hostId" gorm:"index"`
	HostName   string     `json:"hostName" gorm:"size:64"`
	HostAddr   string     `json:"hostAddr" gorm:"size:128"`
	Token      string     `json:"token" gorm:"size:64;uniqueIndex"`
	Status     int8       `json:"status" gorm:"default:1"` // 1=录制中 2=已完成
	StartTime  time.Time  `json:"startTime" gorm:"autoCreateTime"`
	EndTime    *time.Time `json:"endTime"`
	CreateTime time.Time  `json:"createTime" gorm:"autoCreateTime"`
}

func (TerminalSession) TableName() string {
	return "terminal_session"
}

// TerminalSessionData 终端录屏数据（按块存储）
type TerminalSessionData struct {
	ID        int64  `json:"id" gorm:"primaryKey;autoIncrement"`
	SessionID int64  `json:"sessionId" gorm:"index"`
	Sequence  int    `json:"sequence" gorm:"index"` // 数据块序号
	Data      string `json:"data" gorm:"type:mediumtext"`
}

func (TerminalSessionData) TableName() string {
	return "terminal_session_data"
}

type TerminalSessionListRequest struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"pageSize,default=20"`
	UserID   *int64 `form:"userId"`
	HostID   *int64 `form:"hostId"`
	Status   *int8  `form:"status"`
}
