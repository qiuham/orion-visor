// Package guacd implements the Guacamole protocol client.
//
// Apache Guacamole 使用自定义协议（Guacamole protocol）与 guacd 守护进程通信。
// 该协议是基于文本的，每条指令格式为：
//   <length>.<opcode>,<length>.<arg1>,<length>.<arg2>,...;
//
// 本包实现了 Go 原生的 guacd 客户端，支持 RDP 和 VNC 协议代理。
package guacd

import (
	"bufio"
	"fmt"
	"net"
	"strconv"
	"strings"
	"time"
)

const (
	// ProtocolRDP RDP 协议
	ProtocolRDP = "rdp"
	// ProtocolVNC VNC 协议
	ProtocolVNC = "vnc"

	// DefaultGuacdAddr guacd 默认地址
	DefaultGuacdAddr = "127.0.0.1:4822"

	// 指令操作码
	OpcodeSelect     = "select"
	OpcodeConnect    = "connect"
	OpcodeDisconnect = "disconnect"
	OpcodeSize       = "size"
	OpcodeAudio      = "audio"
	OpcodeVideo      = "video"
	OpcodeImage      = "image"
	OpcodeReady      = "ready"
	OpcodeError      = "error"
)

// Instruction 表示一条 Guacamole 协议指令
type Instruction struct {
	Opcode string
	Args   []string
}

// String 将指令编码为 Guacamole 协议格式
func (i *Instruction) String() string {
	var b strings.Builder
	writeElement(&b, i.Opcode)
	for _, arg := range i.Args {
		b.WriteByte(',')
		writeElement(&b, arg)
	}
	b.WriteByte(';')
	return b.String()
}

func writeElement(b *strings.Builder, s string) {
	b.WriteString(strconv.Itoa(len(s)))
	b.WriteByte('.')
	b.WriteString(s)
}

// NewInstruction 创建一条指令
func NewInstruction(opcode string, args ...string) *Instruction {
	return &Instruction{Opcode: opcode, Args: args}
}

// ParseInstruction 解析一条 Guacamole 指令
func ParseInstruction(raw string) (*Instruction, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, fmt.Errorf("空指令")
	}
	// 去掉末尾分号
	if raw[len(raw)-1] == ';' {
		raw = raw[:len(raw)-1]
	}

	parts := splitGuacElements(raw)
	if len(parts) == 0 {
		return nil, fmt.Errorf("无效指令: %s", raw)
	}

	return &Instruction{
		Opcode: parts[0],
		Args:   parts[1:],
	}, nil
}

// splitGuacElements 按 Guacamole 协议格式分割元素
func splitGuacElements(s string) []string {
	var elements []string
	for len(s) > 0 {
		// 读取长度
		dotIdx := strings.IndexByte(s, '.')
		if dotIdx < 0 {
			break
		}
		length, err := strconv.Atoi(s[:dotIdx])
		if err != nil {
			break
		}
		s = s[dotIdx+1:]
		if length > len(s) {
			length = len(s)
		}
		elements = append(elements, s[:length])
		s = s[length:]
		// 跳过逗号分隔符
		if len(s) > 0 && s[0] == ',' {
			s = s[1:]
		}
	}
	return elements
}

// Tunnel 表示到 guacd 的一个连接隧道
type Tunnel struct {
	conn   net.Conn
	reader *bufio.Reader
	UUID   string // 连接 ID（由 guacd 分配）
}

// Connect 连接到 guacd 并建立协议隧道
func Connect(guacdAddr string, protocol string, params map[string]string) (*Tunnel, error) {
	if guacdAddr == "" {
		guacdAddr = DefaultGuacdAddr
	}

	conn, err := net.DialTimeout("tcp", guacdAddr, 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("连接 guacd 失败: %w", err)
	}

	tunnel := &Tunnel{
		conn:   conn,
		reader: bufio.NewReaderSize(conn, 65536),
	}

	// 第1步: 发送 select 指令选择协议
	if err := tunnel.WriteInstruction(NewInstruction(OpcodeSelect, protocol)); err != nil {
		conn.Close()
		return nil, fmt.Errorf("发送 select 失败: %w", err)
	}

	// 第2步: 读取 args 指令（guacd 返回该协议所需的参数名列表）
	argsInst, err := tunnel.ReadInstruction()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("读取 args 失败: %w", err)
	}
	if argsInst.Opcode != "args" {
		conn.Close()
		return nil, fmt.Errorf("期望 args 指令，收到: %s", argsInst.Opcode)
	}

	// 第3步: 构造 connect 指令，按参数名顺序填入对应值
	connectArgs := make([]string, len(argsInst.Args))
	for i, argName := range argsInst.Args {
		if val, ok := params[argName]; ok {
			connectArgs[i] = val
		}
	}
	if err := tunnel.WriteInstruction(NewInstruction(OpcodeConnect, connectArgs...)); err != nil {
		conn.Close()
		return nil, fmt.Errorf("发送 connect 失败: %w", err)
	}

	// 第4步: 读取 ready 指令，获取连接 UUID
	readyInst, err := tunnel.ReadInstruction()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("读取 ready 失败: %w", err)
	}
	if readyInst.Opcode == OpcodeError {
		errMsg := ""
		if len(readyInst.Args) > 0 {
			errMsg = readyInst.Args[0]
		}
		conn.Close()
		return nil, fmt.Errorf("guacd 连接错误: %s", errMsg)
	}
	if readyInst.Opcode != OpcodeReady {
		conn.Close()
		return nil, fmt.Errorf("期望 ready 指令，收到: %s", readyInst.Opcode)
	}
	if len(readyInst.Args) > 0 {
		tunnel.UUID = readyInst.Args[0]
	}

	return tunnel, nil
}

// WriteInstruction 发送一条指令到 guacd
func (t *Tunnel) WriteInstruction(inst *Instruction) error {
	_, err := t.conn.Write([]byte(inst.String()))
	return err
}

// WriteRaw 发送原始数据到 guacd
func (t *Tunnel) WriteRaw(data []byte) error {
	_, err := t.conn.Write(data)
	return err
}

// ReadInstruction 从 guacd 读取一条指令
func (t *Tunnel) ReadInstruction() (*Instruction, error) {
	raw, err := t.readRawInstruction()
	if err != nil {
		return nil, err
	}
	return ParseInstruction(raw)
}

// ReadRaw 从 guacd 读取原始指令数据
func (t *Tunnel) ReadRaw() (string, error) {
	return t.readRawInstruction()
}

func (t *Tunnel) readRawInstruction() (string, error) {
	var b strings.Builder
	for {
		ch, err := t.reader.ReadByte()
		if err != nil {
			return "", err
		}
		b.WriteByte(ch)
		if ch == ';' {
			return b.String(), nil
		}
	}
}

// Close 关闭隧道
func (t *Tunnel) Close() error {
	// 尝试发送 disconnect
	t.WriteInstruction(NewInstruction(OpcodeDisconnect))
	return t.conn.Close()
}

// SetReadDeadline 设置读超时
func (t *Tunnel) SetReadDeadline(d time.Duration) {
	t.conn.SetReadDeadline(time.Now().Add(d))
}
