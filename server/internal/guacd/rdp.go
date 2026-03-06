package guacd

import "strconv"

// RDPConfig RDP 连接配置
type RDPConfig struct {
	Hostname       string
	Port           int
	Username       string
	Password       string
	Domain         string
	Security       string // any, nla, tls, rdp
	IgnoreCert     bool
	Width          int
	Height         int
	DPI            int
	ColorDepth     int    // 8, 16, 24, 32
	ResizeMethod   string // display-update, reconnect
	DisableAudio   bool
	EnablePrinting bool
	EnableDrive    bool
	DrivePath      string
	Console        bool
	ServerLayout   string // 键盘布局, e.g. "en-us-qwerty"
	InitialProgram string
}

// DefaultRDPConfig 返回默认 RDP 配置
func DefaultRDPConfig() *RDPConfig {
	return &RDPConfig{
		Port:         3389,
		Security:     "any",
		IgnoreCert:   true,
		Width:        1920,
		Height:       1080,
		DPI:          96,
		ColorDepth:   24,
		ResizeMethod: "display-update",
		ServerLayout: "en-us-qwerty",
	}
}

// ToParams 转换为 guacd 参数 map
func (c *RDPConfig) ToParams() map[string]string {
	params := map[string]string{
		"hostname":      c.Hostname,
		"port":          strconv.Itoa(c.Port),
		"width":         strconv.Itoa(c.Width),
		"height":        strconv.Itoa(c.Height),
		"dpi":           strconv.Itoa(c.DPI),
		"color-depth":   strconv.Itoa(c.ColorDepth),
		"resize-method": c.ResizeMethod,
		"server-layout": c.ServerLayout,
	}

	if c.Username != "" {
		params["username"] = c.Username
	}
	if c.Password != "" {
		params["password"] = c.Password
	}
	if c.Domain != "" {
		params["domain"] = c.Domain
	}
	if c.Security != "" {
		params["security"] = c.Security
	}
	if c.IgnoreCert {
		params["ignore-cert"] = "true"
	}
	if c.DisableAudio {
		params["disable-audio"] = "true"
	}
	if c.EnablePrinting {
		params["enable-printing"] = "true"
	}
	if c.EnableDrive {
		params["enable-drive"] = "true"
		if c.DrivePath != "" {
			params["drive-path"] = c.DrivePath
		}
	}
	if c.Console {
		params["console"] = "true"
	}
	if c.InitialProgram != "" {
		params["initial-program"] = c.InitialProgram
	}

	return params
}

// ConnectRDP 建立 RDP 连接隧道
func ConnectRDP(guacdAddr string, config *RDPConfig) (*Tunnel, error) {
	return Connect(guacdAddr, ProtocolRDP, config.ToParams())
}
