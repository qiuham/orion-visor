package service

import (
	"encoding/json"

	"github.com/orion-visor/server/internal/model"
	"gorm.io/gorm"
)

type SystemService struct {
	db *gorm.DB
}

func NewSystemService(db *gorm.DB) *SystemService {
	return &SystemService{db: db}
}

// --- 系统参数 ---

func (s *SystemService) GetSettings(settingType string) ([]model.SystemSetting, error) {
	var settings []model.SystemSetting
	q := s.db.Model(&model.SystemSetting{})
	if settingType != "" {
		q = q.Where("type = ?", settingType)
	}
	err := q.Order("id ASC").Find(&settings).Error
	return settings, err
}

func (s *SystemService) GetSetting(item string) (*model.SystemSetting, error) {
	var setting model.SystemSetting
	if err := s.db.Where("item = ?", item).First(&setting).Error; err != nil {
		return nil, err
	}
	return &setting, nil
}

func (s *SystemService) UpdateSetting(item, value string) error {
	return s.db.Model(&model.SystemSetting{}).Where("item = ?", item).Update("value", value).Error
}

// --- 字典 ---

func (s *SystemService) ListDictKeys() ([]model.DictKey, error) {
	var keys []model.DictKey
	err := s.db.Order("id ASC").Find(&keys).Error
	return keys, err
}

func (s *SystemService) CreateDictKey(req *model.DictKeyCreateRequest) (*model.DictKey, error) {
	key := model.DictKey{
		KeyName: req.KeyName,
		Remark:  req.Remark,
	}
	if err := s.db.Create(&key).Error; err != nil {
		return nil, err
	}
	return &key, nil
}

func (s *SystemService) DeleteDictKey(id int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var key model.DictKey
		if err := tx.First(&key, id).Error; err != nil {
			return err
		}
		tx.Where("key_name = ?", key.KeyName).Delete(&model.DictValue{})
		return tx.Delete(&model.DictKey{}, id).Error
	})
}

func (s *SystemService) ListDictValues(keyName string) ([]model.DictValue, error) {
	var values []model.DictValue
	err := s.db.Where("key_name = ?", keyName).Order("sort ASC, id ASC").Find(&values).Error
	return values, err
}

func (s *SystemService) CreateDictValue(req *model.DictValueCreateRequest) (*model.DictValue, error) {
	// 查找 key ID
	var key model.DictKey
	if err := s.db.Where("key_name = ?", req.KeyName).First(&key).Error; err != nil {
		return nil, err
	}
	value := model.DictValue{
		KeyID:   key.ID,
		KeyName: req.KeyName,
		Value:   req.Value,
		Label:   req.Label,
		Extra:   req.Extra,
		Sort:    req.Sort,
	}
	if err := s.db.Create(&value).Error; err != nil {
		return nil, err
	}
	return &value, nil
}

func (s *SystemService) DeleteDictValue(id int64) error {
	return s.db.Delete(&model.DictValue{}, id).Error
}

// ListDictValuesByKeys 按 keyName 列表批量查询字典值
func (s *SystemService) ListDictValuesByKeys(keys []string) map[string][]model.DictValue {
	result := make(map[string][]model.DictValue)
	if len(keys) == 0 {
		return result
	}
	var values []model.DictValue
	s.db.Where("key_name IN ?", keys).Order("sort ASC, id ASC").Find(&values)
	for _, v := range values {
		result[v.KeyName] = append(result[v.KeyName], v)
	}
	for _, k := range keys {
		if _, ok := result[k]; !ok {
			result[k] = []model.DictValue{}
		}
	}
	return result
}

// --- 用户偏好 ---

func (s *SystemService) GetPreference(userID int64, prefType string, items []string) map[string]interface{} {
	result := make(map[string]interface{})
	q := s.db.Model(&model.UserPreference{}).Where("user_id = ? AND type = ?", userID, prefType)
	if len(items) > 0 {
		q = q.Where("item IN ?", items)
	}
	var prefs []model.UserPreference
	q.Find(&prefs)
	for _, p := range prefs {
		result[p.Item] = p.Value
	}
	return result
}

func (s *SystemService) UpdatePreference(userID int64, prefType, item, value string) error {
	var pref model.UserPreference
	err := s.db.Where("user_id = ? AND type = ? AND item = ?", userID, prefType, item).First(&pref).Error
	if err != nil {
		pref = model.UserPreference{UserID: userID, Type: prefType, Item: item, Value: value}
		return s.db.Create(&pref).Error
	}
	return s.db.Model(&pref).Update("value", value).Error
}

func (s *SystemService) UpdatePreferenceBatch(userID int64, prefType string, config map[string]interface{}) error {
	for item, value := range config {
		var val string
		switch v := value.(type) {
		case string:
			val = v
		default:
			b, _ := json.Marshal(v)
			val = string(b)
		}
		if err := s.UpdatePreference(userID, prefType, item, val); err != nil {
			return err
		}
	}
	return nil
}

// --- 主机配置 ---

func (s *SystemService) GetHostConfig(hostID int64, configType string) (*model.HostConfig, error) {
	var cfg model.HostConfig
	if err := s.db.Where("host_id = ? AND type = ?", hostID, configType).First(&cfg).Error; err != nil {
		return nil, err
	}
	return &cfg, nil
}

func (s *SystemService) UpdateHostConfig(hostID int64, configType, config string) error {
	var cfg model.HostConfig
	err := s.db.Where("host_id = ? AND type = ?", hostID, configType).First(&cfg).Error
	if err != nil {
		cfg = model.HostConfig{HostID: hostID, Type: configType, Config: config}
		return s.db.Create(&cfg).Error
	}
	return s.db.Model(&cfg).Update("config", config).Error
}

// --- 主机扩展 ---

func (s *SystemService) GetHostExtra(hostID int64, item string) (*model.HostExtra, error) {
	var extra model.HostExtra
	if err := s.db.Where("host_id = ? AND item = ?", hostID, item).First(&extra).Error; err != nil {
		return nil, err
	}
	return &extra, nil
}

func (s *SystemService) UpdateHostExtra(hostID int64, item, extra string) error {
	var he model.HostExtra
	err := s.db.Where("host_id = ? AND item = ?", hostID, item).First(&he).Error
	if err != nil {
		he = model.HostExtra{HostID: hostID, Item: item, Extra: extra}
		return s.db.Create(&he).Error
	}
	return s.db.Model(&he).Update("extra", extra).Error
}

// --- 统计 ---

func (s *SystemService) CountHosts() int64 {
	var count int64
	s.db.Model(&model.Host{}).Count(&count)
	return count
}

func (s *SystemService) CountUsers() int64 {
	var count int64
	s.db.Model(&model.User{}).Count(&count)
	return count
}

func (s *SystemService) CountTerminalSessions() int64 {
	var count int64
	s.db.Model(&model.TerminalSession{}).Count(&count)
	return count
}

func (s *SystemService) CountTodayOperations() int64 {
	var count int64
	s.db.Model(&model.OperationLog{}).Where("DATE(created_at) = CURDATE()").Count(&count)
	return count
}

// --- 趋势统计 ---

type DailyCount struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

// GetConnectionTrend 最近 N 天的连接数趋势
func (s *SystemService) GetConnectionTrend(days int) []DailyCount {
	var results []DailyCount
	s.db.Raw(`
		SELECT DATE(created_at) as date, COUNT(*) as count
		FROM connect_log
		WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
		GROUP BY DATE(created_at)
		ORDER BY date
	`, days).Scan(&results)
	return results
}

// GetOperationTrend 最近 N 天的操作数趋势
func (s *SystemService) GetOperationTrend(days int) []DailyCount {
	var results []DailyCount
	s.db.Raw(`
		SELECT DATE(created_at) as date, COUNT(*) as count
		FROM operation_log
		WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
		GROUP BY DATE(created_at)
		ORDER BY date
	`, days).Scan(&results)
	return results
}

// GetExecTrend 最近 N 天的执行任务趋势
func (s *SystemService) GetExecTrend(days int) []DailyCount {
	var results []DailyCount
	s.db.Raw(`
		SELECT DATE(created_at) as date, COUNT(*) as count
		FROM exec_job
		WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
		GROUP BY DATE(created_at)
		ORDER BY date
	`, days).Scan(&results)
	return results
}

type ModuleCount struct {
	Module string `json:"module"`
	Count  int64  `json:"count"`
}

// GetOperationByModule 按模块统计操作数
func (s *SystemService) GetOperationByModule() []ModuleCount {
	var results []ModuleCount
	s.db.Raw(`
		SELECT module, COUNT(*) as count
		FROM operation_log
		GROUP BY module
		ORDER BY count DESC
	`).Scan(&results)
	return results
}

// GetHostByType 按类型统计主机数
func (s *SystemService) GetHostByType() []ModuleCount {
	var results []ModuleCount
	s.db.Raw(`
		SELECT type as module, COUNT(*) as count
		FROM asset_host
		GROUP BY type
		ORDER BY count DESC
	`).Scan(&results)
	return results
}

// GetConnectionByType 按协议统计连接数
func (s *SystemService) GetConnectionByType() []ModuleCount {
	var results []ModuleCount
	s.db.Raw(`
		SELECT type as module, COUNT(*) as count
		FROM connect_log
		GROUP BY type
		ORDER BY count DESC
	`).Scan(&results)
	return results
}

// CountExecJobs 执行任务总数
func (s *SystemService) CountExecJobs() int64 {
	var count int64
	s.db.Model(&model.ExecJob{}).Count(&count)
	return count
}

// CountCronJobs 定时任务数
func (s *SystemService) CountCronJobs() int64 {
	var count int64
	s.db.Model(&model.CronJob{}).Count(&count)
	return count
}
