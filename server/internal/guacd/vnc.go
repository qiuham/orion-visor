package guacd

import "strconv"

// VNCConfig VNC 连接配置
type VNCConfig struct {
	Hostname     string
	Port         int
	Password     string
	Width        int
	Height       int
	DPI          int
	ColorDepth   int    // 8, 16, 24, 32
	SwapRedBlue  bool
	Cursor       string // local, remote
	Encodings    string // e.g. "zrle ultra copyrect hextile zlib corre rre raw"
	ReadOnly     bool
	DestHost     string // VNC 网关模式时的目标主机
	DestPort     int
	ClipboardEncoding string // UTF-8 等
}

// DefaultVNCConfig 返回默认 VNC 配置
func DefaultVNCConfig() *VNCConfig {
	return &VNCConfig{
		Port:       5900,
		Width:      1920,
		Height:     1080,
		DPI:        96,
		ColorDepth: 24,
		Cursor:     "local",
	}
}

// ToParams 转换为 guacd 参数 map
func (c *VNCConfig) ToParams() map[string]string {
	params := map[string]string{
		"hostname":    c.Hostname,
		"port":        strconv.Itoa(c.Port),
		"width":       strconv.Itoa(c.Width),
		"height":      strconv.Itoa(c.Height),
		"dpi":         strconv.Itoa(c.DPI),
		"color-depth": strconv.Itoa(c.ColorDepth),
	}

	if c.Password != "" {
		params["password"] = c.Password
	}
	if c.Cursor != "" {
		params["cursor"] = c.Cursor
	}
	if c.SwapRedBlue {
		params["swap-red-blue"] = "true"
	}
	if c.Encodings != "" {
		params["encodings"] = c.Encodings
	}
	if c.ReadOnly {
		params["read-only"] = "true"
	}
	if c.DestHost != "" {
		params["dest-host"] = c.DestHost
		if c.DestPort > 0 {
			params["dest-port"] = strconv.Itoa(c.DestPort)
		}
	}
	if c.ClipboardEncoding != "" {
		params["clipboard-encoding"] = c.ClipboardEncoding
	}

	return params
}

// ConnectVNC 建立 VNC 连接隧道
func ConnectVNC(guacdAddr string, config *VNCConfig) (*Tunnel, error) {
	return Connect(guacdAddr, ProtocolVNC, config.ToParams())
}
