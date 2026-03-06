package service

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/orion-visor/server/internal/model"
	internalssh "github.com/orion-visor/server/internal/ssh"
	"gorm.io/gorm"
)

type ExecService struct {
	db           *gorm.DB
	getSSHConfig func(hostID int64) (*internalssh.ConnectConfig, error)
	hostSvc      *HostService
}

func NewExecService(db *gorm.DB, hostSvc *HostService, getSSHConfig func(hostID int64) (*internalssh.ConnectConfig, error)) *ExecService {
	return &ExecService{db: db, hostSvc: hostSvc, getSSHConfig: getSSHConfig}
}

// CreateJob 创建批量执行任务
func (s *ExecService) CreateJob(req *model.ExecJobCreateRequest, userID int64, username string) (*model.ExecJob, error) {
	hostIDsJSON, _ := json.Marshal(req.HostIDs)
	timeout := req.Timeout
	if timeout <= 0 {
		timeout = 60
	}
	job := model.ExecJob{
		UserID:      userID,
		Username:    username,
		Description: req.Description,
		Command:     req.Command,
		Timeout:     timeout,
		Status:      0,
		HostIDs:     string(hostIDsJSON),
	}
	if err := s.db.Create(&job).Error; err != nil {
		return nil, err
	}

	// 创建各主机的执行记录
	for _, hostID := range req.HostIDs {
		host, err := s.hostSvc.GetByID(hostID)
		hostName, hostAddr := "", ""
		if err == nil {
			hostName = host.Name
			hostAddr = host.Address
		}
		s.db.Create(&model.ExecJobHost{
			JobID:    job.ID,
			HostID:   hostID,
			HostName: hostName,
			HostAddr: hostAddr,
			Status:   0,
		})
	}

	// 异步执行
	go s.executeJob(job.ID)

	return &job, nil
}

// executeJob 执行批量命令
func (s *ExecService) executeJob(jobID int64) {
	now := time.Now()
	s.db.Model(&model.ExecJob{}).Where("id = ?", jobID).Updates(map[string]interface{}{
		"status":     1,
		"start_time": &now,
	})

	var hostRecords []model.ExecJobHost
	s.db.Where("job_id = ?", jobID).Find(&hostRecords)

	var job model.ExecJob
	s.db.First(&job, jobID)

	var wg sync.WaitGroup
	for _, record := range hostRecords {
		wg.Add(1)
		go func(r model.ExecJobHost) {
			defer wg.Done()
			s.executeOnHost(&r, job.Command, job.Timeout)
		}(record)
	}
	wg.Wait()

	// 更新任务状态
	endTime := time.Now()
	var failCount int64
	s.db.Model(&model.ExecJobHost{}).Where("job_id = ? AND status IN (3, 4)", jobID).Count(&failCount)
	status := int8(2) // 已完成
	if failCount > 0 {
		status = 3 // 部分失败
	}
	s.db.Model(&model.ExecJob{}).Where("id = ?", jobID).Updates(map[string]interface{}{
		"status":   status,
		"end_time": &endTime,
	})
}

func (s *ExecService) executeOnHost(record *model.ExecJobHost, command string, timeout int) {
	startTime := time.Now()
	s.db.Model(&model.ExecJobHost{}).Where("id = ?", record.ID).Updates(map[string]interface{}{
		"status":     1,
		"start_time": &startTime,
	})

	sshCfg, err := s.getSSHConfig(record.HostID)
	if err != nil {
		s.finishHostExec(record.ID, 3, -1, "", fmt.Sprintf("获取配置失败: %v", err))
		return
	}

	client, err := internalssh.Connect(sshCfg)
	if err != nil {
		s.finishHostExec(record.ID, 3, -1, "", fmt.Sprintf("SSH 连接失败: %v", err))
		return
	}
	defer client.Close()

	// 执行命令（带超时）
	done := make(chan struct{})
	var output string
	var execErr error

	go func() {
		output, execErr = client.RunCommand(command)
		close(done)
	}()

	select {
	case <-done:
		if execErr != nil {
			s.finishHostExec(record.ID, 3, 1, output, execErr.Error())
		} else {
			s.finishHostExec(record.ID, 2, 0, output, "")
		}
	case <-time.After(time.Duration(timeout) * time.Second):
		s.finishHostExec(record.ID, 4, -1, output, "执行超时")
	}
}

func (s *ExecService) finishHostExec(id int64, status int8, exitCode int, output, errorMsg string) {
	endTime := time.Now()
	// 截断过长的输出
	if len(output) > 1<<20 {
		output = output[:1<<20] + "\n... [输出已截断]"
	}
	s.db.Model(&model.ExecJobHost{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":    status,
		"exit_code": exitCode,
		"output":    output,
		"error_msg": errorMsg,
		"end_time":  &endTime,
	})
}

// GetJob 获取任务详情
func (s *ExecService) GetJob(id int64) (*model.ExecJob, error) {
	var job model.ExecJob
	if err := s.db.First(&job, id).Error; err != nil {
		return nil, err
	}
	return &job, nil
}

// GetJobHosts 获取任务的各主机执行结果
func (s *ExecService) GetJobHosts(jobID int64) ([]model.ExecJobHost, error) {
	var hosts []model.ExecJobHost
	err := s.db.Where("job_id = ?", jobID).Find(&hosts).Error
	return hosts, err
}

// ListJobs 任务列表
func (s *ExecService) ListJobs(req *model.ExecJobListRequest) ([]model.ExecJob, int64, error) {
	var jobs []model.ExecJob
	var total int64
	q := s.db.Model(&model.ExecJob{})
	if req.Status != nil {
		q = q.Where("status = ?", *req.Status)
	}
	if req.UserID != nil {
		q = q.Where("user_id = ?", *req.UserID)
	}
	q.Count(&total)
	offset := (req.Page - 1) * req.PageSize
	err := q.Order("id DESC").Offset(offset).Limit(req.PageSize).Find(&jobs).Error
	return jobs, total, err
}

// CancelJob 取消任务
func (s *ExecService) CancelJob(id int64) error {
	return s.db.Model(&model.ExecJob{}).Where("id = ? AND status IN (0, 1)", id).Update("status", 4).Error
}

// --- 命令片段 ---

func (s *ExecService) ListSnippets(userID int64) ([]model.CommandSnippet, error) {
	var snippets []model.CommandSnippet
	err := s.db.Where("user_id = ?", userID).Order("id DESC").Find(&snippets).Error
	return snippets, err
}

func (s *ExecService) CreateSnippet(req *model.CommandSnippetCreateRequest, userID int64) (*model.CommandSnippet, error) {
	snippet := model.CommandSnippet{
		UserID:  userID,
		Name:    req.Name,
		Command: req.Command,
		GroupID: req.GroupID,
	}
	if err := s.db.Create(&snippet).Error; err != nil {
		return nil, err
	}
	return &snippet, nil
}

func (s *ExecService) UpdateSnippet(id int64, req *model.CommandSnippetUpdateRequest) error {
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Command != "" {
		updates["command"] = req.Command
	}
	if req.GroupID != nil {
		updates["group_id"] = *req.GroupID
	}
	return s.db.Model(&model.CommandSnippet{}).Where("id = ?", id).Updates(updates).Error
}

func (s *ExecService) DeleteSnippet(id int64) error {
	return s.db.Delete(&model.CommandSnippet{}, id).Error
}
