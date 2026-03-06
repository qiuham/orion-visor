package ssh

import (
	"fmt"
	"io"
	"net"
	"time"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

// ConnectConfig holds SSH connection parameters
type ConnectConfig struct {
	Host       string
	Port       int
	Username   string
	Password   string
	PrivateKey string
	Passphrase string
	Timeout    time.Duration
}

// Client wraps an SSH client connection
type Client struct {
	conn *ssh.Client
}

// Connect establishes an SSH connection
func Connect(cfg *ConnectConfig) (*Client, error) {
	auths := buildAuthMethods(cfg)
	config := &ssh.ClientConfig{
		User:            cfg.Username,
		Auth:            auths,
		Timeout:         cfg.Timeout,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}
	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	conn, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return nil, fmt.Errorf("ssh dial: %w", err)
	}
	return &Client{conn: conn}, nil
}

func buildAuthMethods(cfg *ConnectConfig) []ssh.AuthMethod {
	var methods []ssh.AuthMethod
	if cfg.PrivateKey != "" {
		var signer ssh.Signer
		var err error
		if cfg.Passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(cfg.PrivateKey), []byte(cfg.Passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(cfg.PrivateKey))
		}
		if err == nil {
			methods = append(methods, ssh.PublicKeys(signer))
		}
	}
	if cfg.Password != "" {
		methods = append(methods, ssh.Password(cfg.Password))
		methods = append(methods, ssh.KeyboardInteractive(
			func(user, instruction string, questions []string, echos []bool) ([]string, error) {
				answers := make([]string, len(questions))
				for i := range answers {
					answers[i] = cfg.Password
				}
				return answers, nil
			},
		))
	}
	return methods
}

// NewSession creates a new SSH session
func (c *Client) NewSession() (*ssh.Session, error) {
	return c.conn.NewSession()
}

// NewShell creates an interactive shell session with PTY
func (c *Client) NewShell(cols, rows int) (*ssh.Session, io.WriteCloser, io.Reader, error) {
	session, err := c.conn.NewSession()
	if err != nil {
		return nil, nil, nil, err
	}
	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}
	if err := session.RequestPty("xterm-256color", rows, cols, modes); err != nil {
		session.Close()
		return nil, nil, nil, err
	}
	stdin, err := session.StdinPipe()
	if err != nil {
		session.Close()
		return nil, nil, nil, err
	}
	stdout, err := session.StdoutPipe()
	if err != nil {
		session.Close()
		return nil, nil, nil, err
	}
	if err := session.Shell(); err != nil {
		session.Close()
		return nil, nil, nil, err
	}
	return session, stdin, stdout, nil
}

// RunCommand executes a command and returns the output
func (c *Client) RunCommand(cmd string) (string, error) {
	session, err := c.conn.NewSession()
	if err != nil {
		return "", err
	}
	defer session.Close()
	out, err := session.CombinedOutput(cmd)
	return string(out), err
}

// Dial opens a network connection through the SSH tunnel
func (c *Client) Dial(network, addr string) (net.Conn, error) {
	return c.conn.Dial(network, addr)
}

// NewSftpClient creates an SFTP client over the SSH connection
func (c *Client) NewSftpClient() (*sftp.Client, error) {
	return sftp.NewClient(c.conn)
}

// Close closes the SSH connection
func (c *Client) Close() error {
	return c.conn.Close()
}
