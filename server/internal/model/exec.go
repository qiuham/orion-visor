package model

import "time"

// CommandSnippet 命令片段/模板
type CommandSnippet struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID     int64     `json:"userId" gorm:"index"`
	Name       string    `json:"name" gorm:"size:64"`
	Command    string    `json:"command" gorm:"type:text"`
	GroupID    int64     `json:"groupId" gorm:"default:0;index"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (CommandSnippet) TableName() string {
	return "command_snippet"
}

// CommandSnippetGroup 命令片段分组
type CommandSnippetGroup struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID     int64     `json:"userId" gorm:"index"`
	Name       string    `json:"name" gorm:"size:64"`
	Sort       int       `json:"sort" gorm:"default:0"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
}

func (CommandSnippetGroup) TableName() string {
	return "command_snippet_group"
}

// ExecJob 批量执行任务
type ExecJob struct {
	ID          int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID      int64     `json:"userId" gorm:"index"`
	Username    string    `json:"username" gorm:"size:32"`
	Description string    `json:"description" gorm:"size:256"`
	Command     string    `json:"command" gorm:"type:text"`
	Timeout     int       `json:"timeout" gorm:"default:60"` // 秒
	Status      int8      `json:"status" gorm:"default:0"`   // 0=待执行 1=执行中 2=已完成 3=失败 4=已取消
	HostIDs     string    `json:"hostIds" gorm:"type:text"`  // JSON 数组
	CreateTime  time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime  time.Time `json:"updateTime" gorm:"autoUpdateTime"`
	StartTime   *time.Time `json:"startTime"`
	EndTime     *time.Time `json:"endTime"`
}

func (ExecJob) TableName() string {
	return "exec_job"
}

// ExecJobHost 单主机执行结果
type ExecJobHost struct {
	ID         int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	JobID      int64      `json:"jobId" gorm:"index"`
	HostID     int64      `json:"hostId" gorm:"index"`
	HostName   string     `json:"hostName" gorm:"size:64"`
	HostAddr   string     `json:"hostAddr" gorm:"size:128"`
	Status     int8       `json:"status" gorm:"default:0"` // 0=待执行 1=执行中 2=成功 3=失败 4=超时
	ExitCode   int        `json:"exitCode"`
	Output     string     `json:"output" gorm:"type:longtext"`
	ErrorMsg   string     `json:"errorMsg" gorm:"type:text"`
	StartTime  *time.Time `json:"startTime"`
	EndTime    *time.Time `json:"endTime"`
	CreateTime time.Time  `json:"createTime" gorm:"autoCreateTime"`
}

func (ExecJobHost) TableName() string {
	return "exec_job_host"
}

// Request types

type CommandSnippetCreateRequest struct {
	Name    string `json:"name" binding:"required"`
	Command string `json:"command" binding:"required"`
	GroupID int64  `json:"groupId"`
}

type CommandSnippetUpdateRequest struct {
	Name    string `json:"name"`
	Command string `json:"command"`
	GroupID *int64 `json:"groupId"`
}

type ExecJobCreateRequest struct {
	Description string  `json:"description"`
	Command     string  `json:"command" binding:"required"`
	Timeout     int     `json:"timeout"`
	HostIDs     []int64 `json:"hostIds" binding:"required"`
}

type ExecJobListRequest struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"pageSize,default=20"`
	Status   *int8  `form:"status"`
	UserID   *int64 `form:"userId"`
}
