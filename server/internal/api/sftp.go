package api

import (
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	internalssh "github.com/orion-visor/server/internal/ssh"
	"github.com/orion-visor/server/pkg/response"
	"github.com/pkg/sftp"
)

type SftpAPI struct {
	getSSHConfig func(hostID int64) (*internalssh.ConnectConfig, error)
}

func NewSftpAPI(getSSHConfig func(hostID int64) (*internalssh.ConnectConfig, error)) *SftpAPI {
	return &SftpAPI{getSSHConfig: getSSHConfig}
}

type FileInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	IsDir   bool   `json:"isDir"`
	ModTime int64  `json:"modTime"`
	Mode    string `json:"mode"`
}

// List 列出目录内容
func (a *SftpAPI) List(c *gin.Context) {
	hostID, _ := strconv.ParseInt(c.Param("hostId"), 10, 64)
	path := c.DefaultQuery("path", "/")

	client, sftpClient, err := a.connect(hostID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	defer client.Close()
	defer sftpClient.Close()

	entries, err := sftpClient.ReadDir(path)
	if err != nil {
		response.Fail(c, "读取目录失败: "+err.Error())
		return
	}

	var files []FileInfo
	for _, entry := range entries {
		files = append(files, FileInfo{
			Name:    entry.Name(),
			Path:    filepath.Join(path, entry.Name()),
			Size:    entry.Size(),
			IsDir:   entry.IsDir(),
			ModTime: entry.ModTime().UnixMilli(),
			Mode:    entry.Mode().String(),
		})
	}
	response.OK(c, files)
}

// Mkdir 创建目录
func (a *SftpAPI) Mkdir(c *gin.Context) {
	hostID, _ := strconv.ParseInt(c.Param("hostId"), 10, 64)
	var req struct {
		Path string `json:"path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}

	client, sftpClient, err := a.connect(hostID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	defer client.Close()
	defer sftpClient.Close()

	if err := sftpClient.MkdirAll(req.Path); err != nil {
		response.Fail(c, "创建目录失败: "+err.Error())
		return
	}
	response.OK(c, nil)
}

// Remove 删除文件或目录
func (a *SftpAPI) Remove(c *gin.Context) {
	hostID, _ := strconv.ParseInt(c.Param("hostId"), 10, 64)
	var req struct {
		Path string `json:"path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}

	client, sftpClient, err := a.connect(hostID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	defer client.Close()
	defer sftpClient.Close()

	// 检查是否是目录
	info, err := sftpClient.Stat(req.Path)
	if err != nil {
		response.Fail(c, "文件不存在")
		return
	}
	if info.IsDir() {
		err = removeAll(sftpClient, req.Path)
	} else {
		err = sftpClient.Remove(req.Path)
	}
	if err != nil {
		response.Fail(c, "删除失败: "+err.Error())
		return
	}
	response.OK(c, nil)
}

// Download 下载文件
func (a *SftpAPI) Download(c *gin.Context) {
	hostID, _ := strconv.ParseInt(c.Param("hostId"), 10, 64)
	path := c.Query("path")
	if path == "" {
		response.Fail(c, "缺少 path 参数")
		return
	}

	client, sftpClient, err := a.connect(hostID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	defer client.Close()
	defer sftpClient.Close()

	f, err := sftpClient.Open(path)
	if err != nil {
		response.Fail(c, "打开文件失败: "+err.Error())
		return
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		response.Fail(c, "获取文件信息失败")
		return
	}

	fileName := filepath.Base(path)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Length", strconv.FormatInt(info.Size(), 10))
	c.Status(http.StatusOK)
	io.Copy(c.Writer, f)
}

// Upload 上传文件
func (a *SftpAPI) Upload(c *gin.Context) {
	hostID, _ := strconv.ParseInt(c.Param("hostId"), 10, 64)
	destPath := c.PostForm("path")
	if destPath == "" {
		response.Fail(c, "缺少 path 参数")
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.Fail(c, "读取上传文件失败")
		return
	}
	defer file.Close()

	client, sftpClient, err := a.connect(hostID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	defer client.Close()
	defer sftpClient.Close()

	remotePath := filepath.Join(destPath, header.Filename)
	f, err := sftpClient.Create(remotePath)
	if err != nil {
		response.Fail(c, "创建远程文件失败: "+err.Error())
		return
	}
	defer f.Close()

	if _, err := io.Copy(f, file); err != nil {
		response.Fail(c, "上传失败: "+err.Error())
		return
	}

	response.OK(c, map[string]string{"path": remotePath})
}

// Content 读取文本文件内容（用于在线编辑）
func (a *SftpAPI) Content(c *gin.Context) {
	hostID, _ := strconv.ParseInt(c.Param("hostId"), 10, 64)
	path := c.Query("path")
	if path == "" {
		response.Fail(c, "缺少 path 参数")
		return
	}

	client, sftpClient, err := a.connect(hostID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	defer client.Close()
	defer sftpClient.Close()

	f, err := sftpClient.Open(path)
	if err != nil {
		response.Fail(c, "打开文件失败: "+err.Error())
		return
	}
	defer f.Close()

	info, _ := f.Stat()
	// 限制读取大小 (1MB)
	if info.Size() > 1<<20 {
		response.Fail(c, "文件过大，不支持在线查看")
		return
	}

	content, err := io.ReadAll(f)
	if err != nil {
		response.Fail(c, "读取失败")
		return
	}
	response.OK(c, map[string]string{"content": string(content)})
}

// SaveContent 保存文本文件内容
func (a *SftpAPI) SaveContent(c *gin.Context) {
	hostID, _ := strconv.ParseInt(c.Param("hostId"), 10, 64)
	var req struct {
		Path    string `json:"path" binding:"required"`
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}

	client, sftpClient, err := a.connect(hostID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	defer client.Close()
	defer sftpClient.Close()

	f, err := sftpClient.Create(req.Path)
	if err != nil {
		response.Fail(c, "打开文件失败: "+err.Error())
		return
	}
	defer f.Close()

	if _, err := f.Write([]byte(req.Content)); err != nil {
		response.Fail(c, "写入失败: "+err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *SftpAPI) connect(hostID int64) (*internalssh.Client, *sftp.Client, error) {
	sshCfg, err := a.getSSHConfig(hostID)
	if err != nil {
		return nil, nil, fmt.Errorf("获取主机配置失败: %w", err)
	}
	client, err := internalssh.Connect(sshCfg)
	if err != nil {
		return nil, nil, fmt.Errorf("SSH 连接失败: %w", err)
	}
	session, err := client.NewSftpClient()
	if err != nil {
		client.Close()
		return nil, nil, fmt.Errorf("SFTP 连接失败: %w", err)
	}
	return client, session, nil
}

func removeAll(client *sftp.Client, path string) error {
	entries, err := client.ReadDir(path)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		fullPath := filepath.Join(path, entry.Name())
		if entry.IsDir() {
			if err := removeAll(client, fullPath); err != nil {
				return err
			}
		} else {
			if err := client.Remove(fullPath); err != nil {
				return err
			}
		}
	}
	return client.RemoveDirectory(path)
}
