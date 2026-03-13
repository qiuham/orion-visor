package monitor

import (
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	internalssh "github.com/ops-platform/server/internal/ssh"
)

// Metrics 是一次采集的全部指标
type Metrics struct {
	Timestamp  int64      `json:"timestamp"`
	CPU        CPUMetrics `json:"cpu"`
	Memory     MemMetrics `json:"memory"`
	Disks      []DiskInfo `json:"disks"`
	Network    []NetInfo  `json:"network"`
	LoadAvg    [3]float64 `json:"loadAvg"` // 1min, 5min, 15min
	Uptime     int64      `json:"uptime"`  // 秒
	Hostname   string     `json:"hostname"`
	OS         string     `json:"os"`
}

type CPUMetrics struct {
	UsagePercent float64 `json:"usagePercent"`
	Cores        int     `json:"cores"`
}

type MemMetrics struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Available   uint64  `json:"available"`
	UsedPercent float64 `json:"usedPercent"`
	SwapTotal   uint64  `json:"swapTotal"`
	SwapUsed    uint64  `json:"swapUsed"`
}

type DiskInfo struct {
	Mount       string  `json:"mount"`
	Filesystem  string  `json:"filesystem"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	UsedPercent float64 `json:"usedPercent"`
}

type NetInfo struct {
	Interface string `json:"interface"`
	RxBytes   uint64 `json:"rxBytes"`
	TxBytes   uint64 `json:"txBytes"`
}

// 一次性通过 SSH 执行所有采集命令，减少 round trip
const collectScript = `
echo "===HOSTNAME==="
hostname
echo "===OS==="
cat /etc/os-release 2>/dev/null | head -1 || uname -s
echo "===UPTIME==="
cat /proc/uptime
echo "===LOADAVG==="
cat /proc/loadavg
echo "===CPU_STAT==="
head -1 /proc/stat
echo "===CPU_COUNT==="
nproc
echo "===MEMINFO==="
cat /proc/meminfo
echo "===DISK==="
df -B1 -x tmpfs -x devtmpfs -x overlay 2>/dev/null || df -k
echo "===NET==="
cat /proc/net/dev
echo "===END==="
`

// Collect 通过 SSH 连接采集主机指标
func Collect(client *internalssh.Client) (*Metrics, error) {
	output, err := client.RunCommand(collectScript)
	if err != nil {
		return nil, fmt.Errorf("collect metrics: %w", err)
	}
	return parseMetrics(output)
}

func parseMetrics(output string) (*Metrics, error) {
	m := &Metrics{Timestamp: time.Now().UnixMilli()}
	sections := splitSections(output)

	// Hostname
	if s, ok := sections["HOSTNAME"]; ok {
		m.Hostname = strings.TrimSpace(s)
	}

	// OS
	if s, ok := sections["OS"]; ok {
		m.OS = strings.TrimSpace(s)
	}

	// Uptime
	if s, ok := sections["UPTIME"]; ok {
		parts := strings.Fields(s)
		if len(parts) > 0 {
			if v, err := strconv.ParseFloat(parts[0], 64); err == nil {
				m.Uptime = int64(v)
			}
		}
	}

	// Load average
	if s, ok := sections["LOADAVG"]; ok {
		parts := strings.Fields(s)
		for i := 0; i < 3 && i < len(parts); i++ {
			if v, err := strconv.ParseFloat(parts[i], 64); err == nil {
				m.LoadAvg[i] = v
			}
		}
	}

	// CPU
	if s, ok := sections["CPU_STAT"]; ok {
		m.CPU = parseCPU(s)
	}
	if s, ok := sections["CPU_COUNT"]; ok {
		if cores, err := strconv.Atoi(strings.TrimSpace(s)); err == nil {
			m.CPU.Cores = cores
		}
	}

	// Memory
	if s, ok := sections["MEMINFO"]; ok {
		m.Memory = parseMemInfo(s)
	}

	// Disk
	if s, ok := sections["DISK"]; ok {
		m.Disks = parseDisk(s)
	}

	// Network
	if s, ok := sections["NET"]; ok {
		m.Network = parseNet(s)
	}

	return m, nil
}

func splitSections(output string) map[string]string {
	sections := make(map[string]string)
	lines := strings.Split(output, "\n")
	var currentKey string
	var buf strings.Builder
	for _, line := range lines {
		if strings.HasPrefix(line, "===") && strings.HasSuffix(line, "===") {
			if currentKey != "" {
				sections[currentKey] = buf.String()
				buf.Reset()
			}
			currentKey = strings.Trim(line, "=")
		} else if currentKey != "" {
			buf.WriteString(line)
			buf.WriteByte('\n')
		}
	}
	if currentKey != "" {
		sections[currentKey] = buf.String()
	}
	return sections
}

// CPU 使用率需要两次采样计算差值，这里先存原始值
var (
	prevCPU   map[string][4]uint64 // host -> [user, nice, system, idle]
	prevCPUMu sync.Mutex
)

func init() {
	prevCPU = make(map[string][4]uint64)
}

func parseCPU(s string) CPUMetrics {
	fields := strings.Fields(strings.TrimSpace(s))
	if len(fields) < 5 {
		return CPUMetrics{}
	}
	// cpu user nice system idle ...
	user, _ := strconv.ParseUint(fields[1], 10, 64)
	nice, _ := strconv.ParseUint(fields[2], 10, 64)
	system, _ := strconv.ParseUint(fields[3], 10, 64)
	idle, _ := strconv.ParseUint(fields[4], 10, 64)
	total := user + nice + system + idle
	busy := user + nice + system

	if total == 0 {
		return CPUMetrics{}
	}
	return CPUMetrics{
		UsagePercent: float64(busy) / float64(total) * 100,
	}
}

func parseMemInfo(s string) MemMetrics {
	m := MemMetrics{}
	var memFree, buffers, cached, sReclaimable uint64
	for _, line := range strings.Split(s, "\n") {
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}
		val, _ := strconv.ParseUint(parts[1], 10, 64)
		val *= 1024 // /proc/meminfo 单位是 kB
		switch parts[0] {
		case "MemTotal:":
			m.Total = val
		case "MemFree:":
			memFree = val
		case "MemAvailable:":
			m.Available = val
		case "Buffers:":
			buffers = val
		case "Cached:":
			cached = val
		case "SReclaimable:":
			sReclaimable = val
		case "SwapTotal:":
			m.SwapTotal = val
		case "SwapFree:":
			m.SwapUsed = m.SwapTotal - val
		}
	}
	if m.Available == 0 {
		m.Available = memFree + buffers + cached + sReclaimable
	}
	m.Used = m.Total - m.Available
	if m.Total > 0 {
		m.UsedPercent = float64(m.Used) / float64(m.Total) * 100
	}
	return m
}

func parseDisk(s string) []DiskInfo {
	var disks []DiskInfo
	for i, line := range strings.Split(s, "\n") {
		if i == 0 || strings.TrimSpace(line) == "" {
			continue // 跳过标题行
		}
		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}
		total, _ := strconv.ParseUint(fields[1], 10, 64)
		used, _ := strconv.ParseUint(fields[2], 10, 64)
		var pct float64
		if total > 0 {
			pct = float64(used) / float64(total) * 100
		}
		mount := fields[len(fields)-1]
		disks = append(disks, DiskInfo{
			Filesystem:  fields[0],
			Total:       total,
			Used:        used,
			UsedPercent: pct,
			Mount:       mount,
		})
	}
	return disks
}

func parseNet(s string) []NetInfo {
	var nets []NetInfo
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimSpace(line)
		if !strings.Contains(line, ":") || strings.HasPrefix(line, "Inter") || strings.HasPrefix(line, "face") {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		iface := strings.TrimSpace(parts[0])
		if iface == "lo" {
			continue
		}
		fields := strings.Fields(parts[1])
		if len(fields) < 10 {
			continue
		}
		rxBytes, _ := strconv.ParseUint(fields[0], 10, 64)
		txBytes, _ := strconv.ParseUint(fields[8], 10, 64)
		nets = append(nets, NetInfo{
			Interface: iface,
			RxBytes:   rxBytes,
			TxBytes:   txBytes,
		})
	}
	return nets
}
