package model

import "time"

// OperationLog 操作审计日志
type OperationLog struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID     int64     `json:"userId" gorm:"index"`
	Username   string    `json:"username" gorm:"size:32"`
	Module     string    `json:"module" gorm:"size:32;index"` // host, user, terminal, sftp...
	Type       string    `json:"type" gorm:"size:32"`         // create, update, delete, connect, upload...
	RiskLevel  int8      `json:"riskLevel" gorm:"default:1"`  // 1=低 2=中 3=高
	Param      string    `json:"param" gorm:"type:text"`      // 请求参数 JSON
	Result     int8      `json:"result" gorm:"default:1"`     // 1=成功 2=失败
	ResultMsg  string    `json:"resultMsg" gorm:"size:512"`
	IP         string    `json:"ip" gorm:"size:64"`
	UserAgent  string    `json:"userAgent" gorm:"size:512"`
	Duration   int64     `json:"duration"` // 耗时 ms
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime;index"`
}

func (OperationLog) TableName() string {
	return "system_operation_log"
}

type OperationLogListRequest struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"pageSize,default=20"`
	UserID   *int64 `form:"userId"`
	Module   string `form:"module"`
	Type     string `form:"type"`
	Result   *int8  `form:"result"`
}

// ConnectLog 终端连接日志
type ConnectLog struct {
	ID         int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID     int64      `json:"userId" gorm:"index"`
	Username   string     `json:"username" gorm:"size:32"`
	HostID     int64      `json:"hostId" gorm:"index"`
	HostName   string     `json:"hostName" gorm:"size:64"`
	HostAddr   string     `json:"hostAddr" gorm:"size:128"`
	Type       string     `json:"type" gorm:"size:12"` // SSH, SFTP
	Token      string     `json:"token" gorm:"size:64;uniqueIndex"`
	Status     int8       `json:"status" gorm:"default:1"` // 1=连接中 2=已断开
	StartTime  time.Time  `json:"startTime" gorm:"autoCreateTime"`
	EndTime    *time.Time `json:"endTime"`
	CreateTime time.Time  `json:"createTime" gorm:"autoCreateTime"`
}

func (ConnectLog) TableName() string {
	return "asset_connect_log"
}

type ConnectLogListRequest struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"pageSize,default=20"`
	UserID   *int64 `form:"userId"`
	HostID   *int64 `form:"hostId"`
	Type     string `form:"type"`
	Status   *int8  `form:"status"`
}
