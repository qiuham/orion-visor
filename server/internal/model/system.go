package model

import "time"

// SystemSetting 系统参数配置
type SystemSetting struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Type       string    `json:"type" gorm:"size:32;index"`    // system, security, terminal...
	Item       string    `json:"item" gorm:"size:64;uniqueIndex"`
	Value      string    `json:"value" gorm:"type:text"`
	Remark     string    `json:"remark" gorm:"size:256"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (SystemSetting) TableName() string {
	return "system_setting"
}

// DictKey 字典类型
type DictKey struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	KeyName    string    `json:"keyName" gorm:"size:64;uniqueIndex"`
	Remark     string    `json:"remark" gorm:"size:256"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (DictKey) TableName() string {
	return "dict_key"
}

// DictValue 字典值
type DictValue struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	KeyID      int64     `json:"keyId" gorm:"index"`
	KeyName    string    `json:"keyName" gorm:"size:64;index"`
	Value      string    `json:"value" gorm:"size:256"`
	Label      string    `json:"label" gorm:"size:256"`
	Extra      string    `json:"extra" gorm:"type:text"`
	Sort       int       `json:"sort" gorm:"default:0"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (DictValue) TableName() string {
	return "dict_value"
}

// CronJob 定时任务
type CronJob struct {
	ID          int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string     `json:"name" gorm:"size:64"`
	Expression  string     `json:"expression" gorm:"size:128"` // cron 表达式
	Command     string     `json:"command" gorm:"type:text"`
	HostIDs     string     `json:"hostIds" gorm:"type:text"` // JSON 数组
	Status      int8       `json:"status" gorm:"default:1"`  // 1=启用 2=停用
	Remark      string     `json:"remark" gorm:"size:256"`
	LastExecAt  *time.Time `json:"lastExecAt"`
	NextExecAt  *time.Time `json:"nextExecAt"`
	CreateTime  time.Time  `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime  time.Time  `json:"updateTime" gorm:"autoUpdateTime"`
}

func (CronJob) TableName() string {
	return "exec_cron_job"
}

// CronJobLog 定时任务执行日志
type CronJobLog struct {
	ID         int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	JobID      int64      `json:"jobId" gorm:"index"`
	Status     int8       `json:"status" gorm:"default:0"` // 0=执行中 1=成功 2=失败
	Output     string     `json:"output" gorm:"type:longtext"`
	StartTime  time.Time  `json:"startTime"`
	EndTime    *time.Time `json:"endTime"`
	CreateTime time.Time  `json:"createTime" gorm:"autoCreateTime"`
}

func (CronJobLog) TableName() string {
	return "exec_cron_job_log"
}

// UserPreference 用户偏好设置
type UserPreference struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID     int64     `json:"userId" gorm:"index"`
	Type       string    `json:"type" gorm:"size:32;index"` // SYSTEM, TERMINAL
	Item       string    `json:"item" gorm:"size:64"`
	Value      string    `json:"value" gorm:"type:text"`
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (UserPreference) TableName() string {
	return "user_preference"
}

// HostExtra 主机扩展数据
type HostExtra struct {
	ID         int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	HostID     int64     `json:"hostId" gorm:"index"`
	Item       string    `json:"item" gorm:"size:32;index"` // SPEC, SSH, RDP, VNC, LABEL
	Extra      string    `json:"extra" gorm:"type:text"`    // JSON 格式
	CreateTime time.Time `json:"createTime" gorm:"autoCreateTime"`
	UpdateTime time.Time `json:"updateTime" gorm:"autoUpdateTime"`
}

func (HostExtra) TableName() string {
	return "asset_host_extra"
}

// Request types

type SystemSettingUpdateRequest struct {
	Value string `json:"value"`
}

type DictKeyCreateRequest struct {
	KeyName string `json:"keyName" binding:"required"`
	Remark  string `json:"remark"`
}

type DictValueCreateRequest struct {
	KeyName string `json:"keyName" binding:"required"`
	Value   string `json:"value" binding:"required"`
	Label   string `json:"label" binding:"required"`
	Extra   string `json:"extra"`
	Sort    int    `json:"sort"`
}

type CronJobCreateRequest struct {
	Name       string  `json:"name" binding:"required"`
	Expression string  `json:"expression" binding:"required"`
	Command    string  `json:"command" binding:"required"`
	HostIDs    []int64 `json:"hostIds" binding:"required"`
	Remark     string  `json:"remark"`
}

type CronJobUpdateRequest struct {
	Name       string  `json:"name"`
	Expression string  `json:"expression"`
	Command    string  `json:"command"`
	HostIDs    []int64 `json:"hostIds"`
	Status     *int8   `json:"status"`
	Remark     string  `json:"remark"`
}
