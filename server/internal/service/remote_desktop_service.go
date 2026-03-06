package service

import (
	"encoding/json"
	"fmt"

	"github.com/orion-visor/server/internal/guacd"
	"github.com/orion-visor/server/internal/model"
	"gorm.io/gorm"
)

// RemoteDesktopService 远程桌面配置服务
type RemoteDesktopService struct {
	db          *gorm.DB
	hostSvc     *HostService
	identitySvc *IdentityService
}

func NewRemoteDesktopService(db *gorm.DB, hostSvc *HostService, identitySvc *IdentityService) *RemoteDesktopService {
	return &RemoteDesktopService{db: db, hostSvc: hostSvc, identitySvc: identitySvc}
}

// RDPExtraConfig 主机 RDP 额外配置（存储在 host_config.config JSON 中）
type RDPExtraConfig struct {
	Domain         string `json:"domain"`
	Security       string `json:"security"`       // any, nla, tls, rdp
	IgnoreCert     bool   `json:"ignoreCert"`
	ColorDepth     int    `json:"colorDepth"`
	ResizeMethod   string `json:"resizeMethod"`
	Console        bool   `json:"console"`
	ServerLayout   string `json:"serverLayout"`
	EnableDrive    bool   `json:"enableDrive"`
	DrivePath      string `json:"drivePath"`
	InitialProgram string `json:"initialProgram"`
}

// VNCExtraConfig 主机 VNC 额外配置
type VNCExtraConfig struct {
	Cursor       string `json:"cursor"`
	ColorDepth   int    `json:"colorDepth"`
	SwapRedBlue  bool   `json:"swapRedBlue"`
	ReadOnly     bool   `json:"readOnly"`
	Encodings    string `json:"encodings"`
}

// GetRDPConfig 从主机信息构建 guacd RDP 配置
func (s *RemoteDesktopService) GetRDPConfig(hostID int64) (*guacd.RDPConfig, error) {
	host, err := s.hostSvc.GetByID(hostID)
	if err != nil {
		return nil, fmt.Errorf("主机不存在: %w", err)
	}
	if host.Type != "RDP" && host.Type != "rdp" {
		return nil, fmt.Errorf("主机 %s 不是 RDP 类型", host.Name)
	}

	cfg := guacd.DefaultRDPConfig()
	cfg.Hostname = host.Address
	if host.Port > 0 {
		cfg.Port = host.Port
	}

	// 使用凭证
	if host.IdentityID > 0 {
		identity, err := s.identitySvc.GetByID(host.IdentityID)
		if err == nil {
			cfg.Username = identity.Username
			cfg.Password = identity.Password
		}
	}

	// 读取额外配置
	var hostConfig model.HostConfig
	if err := s.db.Where("host_id = ? AND type = 'RDP'", hostID).First(&hostConfig).Error; err == nil {
		var extra RDPExtraConfig
		if json.Unmarshal([]byte(hostConfig.Config), &extra) == nil {
			if extra.Domain != "" {
				cfg.Domain = extra.Domain
			}
			if extra.Security != "" {
				cfg.Security = extra.Security
			}
			cfg.IgnoreCert = extra.IgnoreCert
			if extra.ColorDepth > 0 {
				cfg.ColorDepth = extra.ColorDepth
			}
			if extra.ResizeMethod != "" {
				cfg.ResizeMethod = extra.ResizeMethod
			}
			cfg.Console = extra.Console
			if extra.ServerLayout != "" {
				cfg.ServerLayout = extra.ServerLayout
			}
			cfg.EnableDrive = extra.EnableDrive
			cfg.DrivePath = extra.DrivePath
			cfg.InitialProgram = extra.InitialProgram
		}
	}

	return cfg, nil
}

// GetVNCConfig 从主机信息构建 guacd VNC 配置
func (s *RemoteDesktopService) GetVNCConfig(hostID int64) (*guacd.VNCConfig, error) {
	host, err := s.hostSvc.GetByID(hostID)
	if err != nil {
		return nil, fmt.Errorf("主机不存在: %w", err)
	}
	if host.Type != "VNC" && host.Type != "vnc" {
		return nil, fmt.Errorf("主机 %s 不是 VNC 类型", host.Name)
	}

	cfg := guacd.DefaultVNCConfig()
	cfg.Hostname = host.Address
	if host.Port > 0 {
		cfg.Port = host.Port
	}

	// VNC 一般使用密码认证（不分用户名）
	if host.IdentityID > 0 {
		identity, err := s.identitySvc.GetByID(host.IdentityID)
		if err == nil {
			cfg.Password = identity.Password
		}
	}

	// 读取额外配置
	var hostConfig model.HostConfig
	if err := s.db.Where("host_id = ? AND type = 'VNC'", hostID).First(&hostConfig).Error; err == nil {
		var extra VNCExtraConfig
		if json.Unmarshal([]byte(hostConfig.Config), &extra) == nil {
			if extra.Cursor != "" {
				cfg.Cursor = extra.Cursor
			}
			if extra.ColorDepth > 0 {
				cfg.ColorDepth = extra.ColorDepth
			}
			cfg.SwapRedBlue = extra.SwapRedBlue
			cfg.ReadOnly = extra.ReadOnly
			if extra.Encodings != "" {
				cfg.Encodings = extra.Encodings
			}
		}
	}

	return cfg, nil
}

// SaveHostConfig 保存主机协议配置
func (s *RemoteDesktopService) SaveHostConfig(hostID int64, hostType string, configJSON string) error {
	var existing model.HostConfig
	err := s.db.Where("host_id = ? AND type = ?", hostID, hostType).First(&existing).Error
	if err == nil {
		// 更新
		return s.db.Model(&existing).Update("config", configJSON).Error
	}
	// 创建
	return s.db.Create(&model.HostConfig{
		HostID: hostID,
		Type:   hostType,
		Config: configJSON,
	}).Error
}

// GetHostConfig 获取主机协议配置
func (s *RemoteDesktopService) GetHostConfig(hostID int64, hostType string) (*model.HostConfig, error) {
	var config model.HostConfig
	err := s.db.Where("host_id = ? AND type = ?", hostID, hostType).First(&config).Error
	return &config, err
}
