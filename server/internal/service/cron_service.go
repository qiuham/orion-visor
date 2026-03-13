package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/ops-platform/server/internal/model"
	internalssh "github.com/ops-platform/server/internal/ssh"
	"gorm.io/gorm"
)

type CronService struct {
	db           *gorm.DB
	getSSHConfig func(hostID int64) (*internalssh.ConnectConfig, error)
	hostSvc      *HostService
	mu           sync.Mutex
	stopChans    map[int64]chan struct{} // jobID -> stop channel
}

func NewCronService(db *gorm.DB, hostSvc *HostService, getSSHConfig func(hostID int64) (*internalssh.ConnectConfig, error)) *CronService {
	return &CronService{
		db:           db,
		hostSvc:      hostSvc,
		getSSHConfig: getSSHConfig,
		stopChans:    make(map[int64]chan struct{}),
	}
}

// StartAllJobs 启动所有启用的定时任务（应用启动时调用）
func (s *CronService) StartAllJobs() {
	var jobs []model.CronJob
	s.db.Where("status = 1").Find(&jobs)
	for _, job := range jobs {
		s.startJob(job)
	}
	log.Printf("已启动 %d 个定时任务", len(jobs))
}

// Create 创建定时任务
func (s *CronService) Create(req *model.CronJobCreateRequest) (*model.CronJob, error) {
	hostIDsJSON, _ := json.Marshal(req.HostIDs)
	job := model.CronJob{
		Name:       req.Name,
		Expression: req.Expression,
		Command:    req.Command,
		HostIDs:    string(hostIDsJSON),
		Status:     1,
		Remark:     req.Remark,
	}
	if err := s.db.Create(&job).Error; err != nil {
		return nil, err
	}
	s.startJob(job)
	return &job, nil
}

// Update 更新定时任务
func (s *CronService) Update(id int64, req *model.CronJobUpdateRequest) error {
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Expression != "" {
		updates["expression"] = req.Expression
	}
	if req.Command != "" {
		updates["command"] = req.Command
	}
	if req.HostIDs != nil {
		hostIDsJSON, _ := json.Marshal(req.HostIDs)
		updates["host_ids"] = string(hostIDsJSON)
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}
	if len(updates) == 0 {
		return errors.New("没有要更新的字段")
	}

	if err := s.db.Model(&model.CronJob{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return err
	}

	// 重启任务
	s.stopJob(id)
	if req.Status == nil || *req.Status == 1 {
		var job model.CronJob
		s.db.First(&job, id)
		s.startJob(job)
	}
	return nil
}

// Delete 删除定时任务
func (s *CronService) Delete(id int64) error {
	s.stopJob(id)
	return s.db.Transaction(func(tx *gorm.DB) error {
		tx.Where("job_id = ?", id).Delete(&model.CronJobLog{})
		return tx.Delete(&model.CronJob{}, id).Error
	})
}

// List 任务列表
func (s *CronService) List() ([]model.CronJob, error) {
	var jobs []model.CronJob
	err := s.db.Order("id DESC").Find(&jobs).Error
	return jobs, err
}

// GetLogs 获取任务执行日志
func (s *CronService) GetLogs(jobID int64, page, pageSize int) ([]model.CronJobLog, int64, error) {
	var logs []model.CronJobLog
	var total int64
	q := s.db.Model(&model.CronJobLog{}).Where("job_id = ?", jobID)
	q.Count(&total)
	offset := (page - 1) * pageSize
	err := q.Order("id DESC").Offset(offset).Limit(pageSize).Find(&logs).Error
	return logs, total, err
}

// TriggerJob 手动触发一次任务
func (s *CronService) TriggerJob(id int64) error {
	var job model.CronJob
	if err := s.db.First(&job, id).Error; err != nil {
		return err
	}
	go s.executeJob(&job)
	return nil
}

func (s *CronService) startJob(job model.CronJob) {
	// 简单的定时循环实现（生产环境应使用 robfig/cron）
	// 解析 expression 作为间隔秒数的简易实现
	interval := parseCronInterval(job.Expression)
	if interval <= 0 {
		return
	}

	stop := make(chan struct{})
	s.mu.Lock()
	s.stopChans[job.ID] = stop
	s.mu.Unlock()

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-stop:
				return
			case <-ticker.C:
				var currentJob model.CronJob
				if err := s.db.First(&currentJob, job.ID).Error; err != nil {
					return
				}
				if currentJob.Status != 1 {
					return
				}
				s.executeJob(&currentJob)
			}
		}
	}()
}

func (s *CronService) stopJob(id int64) {
	s.mu.Lock()
	if ch, ok := s.stopChans[id]; ok {
		close(ch)
		delete(s.stopChans, id)
	}
	s.mu.Unlock()
}

func (s *CronService) executeJob(job *model.CronJob) {
	startTime := time.Now()
	cronLog := model.CronJobLog{
		JobID:     job.ID,
		Status:    0,
		StartTime: startTime,
	}
	s.db.Create(&cronLog)

	var hostIDs []int64
	json.Unmarshal([]byte(job.HostIDs), &hostIDs)

	var allOutput string
	allSuccess := true

	for _, hostID := range hostIDs {
		sshCfg, err := s.getSSHConfig(hostID)
		if err != nil {
			allOutput += fmt.Sprintf("[主机 %d] 获取配置失败: %v\n", hostID, err)
			allSuccess = false
			continue
		}
		client, err := internalssh.Connect(sshCfg)
		if err != nil {
			allOutput += fmt.Sprintf("[主机 %d] 连接失败: %v\n", hostID, err)
			allSuccess = false
			continue
		}
		output, err := client.RunCommand(job.Command)
		client.Close()
		if err != nil {
			allOutput += fmt.Sprintf("[主机 %d] 执行失败: %v\n输出:\n%s\n", hostID, err, output)
			allSuccess = false
		} else {
			allOutput += fmt.Sprintf("[主机 %d] 执行成功\n输出:\n%s\n", hostID, output)
		}
	}

	endTime := time.Now()
	status := int8(1) // 成功
	if !allSuccess {
		status = 2
	}
	s.db.Model(&model.CronJobLog{}).Where("id = ?", cronLog.ID).Updates(map[string]interface{}{
		"status":   status,
		"output":   allOutput,
		"end_time": &endTime,
	})

	// 更新任务最后执行时间
	s.db.Model(&model.CronJob{}).Where("id = ?", job.ID).Update("last_exec_at", &endTime)
}

// parseCronInterval 简易 cron 表达式解析
// 支持格式: "@every 30s", "@every 5m", "@every 1h" 或秒数
func parseCronInterval(expr string) time.Duration {
	d, err := time.ParseDuration(expr)
	if err == nil {
		return d
	}
	// 尝试 @every 格式
	var durStr string
	if n, _ := fmt.Sscanf(expr, "@every %s", &durStr); n > 0 {
		if d, err := time.ParseDuration(durStr); err == nil {
			return d
		}
	}
	return 0
}
