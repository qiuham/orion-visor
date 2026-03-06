package api

// compat.go - 前端 API 兼容层
// 将 orion-visor-ui 前端期望的 Java 风格 API 路径映射到 Go 后端服务
// 前端路径格式: /infra/auth/login, /asset/host/query 等
// 本文件提供适配处理器，使前端无需修改即可对接 Go 后端

import (
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/middleware"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	"github.com/orion-visor/server/pkg/response"
)

// CompatAPI 前端兼容 API 适配器
type CompatAPI struct {
	userSvc    *service.UserService
	hostSvc    *service.HostService
	roleSvc    *service.RoleService
	identitySvc *service.IdentityService
	groupSvc   *service.HostGroupService
}

func NewCompatAPI(
	userSvc *service.UserService,
	hostSvc *service.HostService,
	roleSvc *service.RoleService,
	identitySvc *service.IdentityService,
	groupSvc *service.HostGroupService,
) *CompatAPI {
	return &CompatAPI{
		userSvc:     userSvc,
		hostSvc:     hostSvc,
		roleSvc:     roleSvc,
		identitySvc: identitySvc,
		groupSvc:    groupSvc,
	}
}

// ========== /infra/auth ==========

// Login POST /infra/auth/login
// 前端发送 {username, password} (password 已经 MD5)
// 返回 {token}
func (a *CompatAPI) Login(c *gin.Context) {
	var req model.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	user, err := a.userSvc.Login(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	token, err := middleware.GenerateToken(user.ID, user.Username)
	if err != nil {
		response.Fail(c, "生成令牌失败")
		return
	}
	// 前端只需要 token
	response.OK(c, gin.H{"token": token})
}

// Logout GET /infra/auth/logout
func (a *CompatAPI) Logout(c *gin.Context) {
	response.OK(c, nil)
}

// ========== /infra/user-aggregate ==========

// GetUserAggregate GET /infra/user-aggregate/user
// 前端 getUserAggregateInfo 用 unwrap:true，直接拿 response.data
// 返回 {user, roles, permissions, systemPreference, tippedKeys}
func (a *CompatAPI) GetUserAggregate(c *gin.Context) {
	userID := c.GetInt64("userId")
	user, err := a.userSvc.GetByID(userID)
	if err != nil {
		response.Fail(c, "用户不存在")
		return
	}

	// 获取角色
	roleNames := []string{}
	roles, _ := a.roleSvc.GetUserRolesDetail(userID)
	for _, r := range roles {
		roleNames = append(roleNames, r.Code)
	}

	// 获取权限
	permissions, _ := a.roleSvc.GetUserPermissions(userID)

	response.OK(c, gin.H{
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"nickname": user.Nickname,
			"avatar":   user.Avatar,
		},
		"roles":            roleNames,
		"permissions":      permissions,
		"systemPreference": gin.H{},
		"tippedKeys":       []string{},
	})
}

// GetUserMenu GET /infra/user-aggregate/menu
// 返回菜单树给前端动态路由
func (a *CompatAPI) GetUserMenu(c *gin.Context) {
	userID := c.GetInt64("userId")

	// 获取用户角色
	isAdmin := a.roleSvc.IsAdmin(userID)

	// 获取菜单
	var menus []model.Menu
	if isAdmin {
		menus, _ = a.roleSvc.ListAllMenus()
	} else {
		menus, _ = a.roleSvc.GetUserMenus(userID)
	}

	// 转换为前端期望的格式
	menuList := make([]gin.H, 0, len(menus))
	for _, m := range menus {
		item := gin.H{
			"id":         m.ID,
			"parentId":   m.ParentID,
			"name":       m.Name,
			"permission": m.Permission,
			"type":       m.Type,
			"sort":       m.Sort,
			"visible":    m.Visible,
			"status":     m.Status,
			"icon":       m.Icon,
			"path":       m.Path,
			"component":  m.Component,
		}
		menuList = append(menuList, item)
	}
	response.OK(c, menuList)
}

// ========== /infra/mine ==========

// GetCurrentUserInfo GET /infra/mine/get-user
func (a *CompatAPI) GetCurrentUserInfo(c *gin.Context) {
	userID := c.GetInt64("userId")
	user, err := a.userSvc.GetByID(userID)
	if err != nil {
		response.Fail(c, "用户不存在")
		return
	}
	response.OK(c, gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"nickname":   user.Nickname,
		"avatar":     user.Avatar,
		"mobile":     user.Mobile,
		"email":      user.Email,
		"status":     user.Status,
		"createTime": timeToMs(user.CreateTime),
		"updateTime": timeToMs(user.UpdateTime),
	})
}

// UpdateCurrentUserPassword PUT /infra/mine/update-password
func (a *CompatAPI) UpdateCurrentUserPassword(c *gin.Context) {
	var req struct {
		BeforePassword string `json:"beforePassword"`
		Password       string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	userID := c.GetInt64("userId")
	if err := a.userSvc.UpdatePassword(userID, req.Password); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// ========== /asset/host ==========

// HostQueryRequest 前端主机查询请求 (POST body)
type HostQueryRequest struct {
	Page     int    `json:"page"`
	Limit    int    `json:"limit"`
	Name     string `json:"name"`
	Address  string `json:"address"`
	Code     string `json:"code"`
	Type     string `json:"type"`
	Status   *int8  `json:"status"`
	Tags     string `json:"tags"`
}

// QueryHosts POST /asset/host/query
func (a *CompatAPI) QueryHosts(c *gin.Context) {
	var req HostQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.Limit <= 0 {
		req.Limit = 20
	}
	listReq := &model.HostListRequest{
		Page:     req.Page,
		PageSize: req.Limit,
		Name:     req.Name,
		Type:     req.Type,
		Status:   req.Status,
	}
	hosts, total, err := a.hostSvc.List(listReq)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	// 前端期望 {total, rows}
	rows := make([]gin.H, 0, len(hosts))
	for _, h := range hosts {
		rows = append(rows, gin.H{
			"id":         h.ID,
			"type":       h.Type,
			"name":       h.Name,
			"code":       h.Code,
			"address":    h.Address,
			"port":       h.Port,
			"status":     h.Status,
			"tags":       parseTags(h.Tags),
			"remark":     h.Remark,
			"createTime": timeToMs(h.CreateTime),
			"updateTime": timeToMs(h.UpdateTime),
			"creator":    h.Creator,
		})
	}
	response.OKPage(c, total, rows)
}

// GetHost GET /asset/host/get?id=&base=
func (a *CompatAPI) GetHost(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Query("id"), 10, 64)
	host, err := a.hostSvc.GetByID(id)
	if err != nil {
		response.Fail(c, "主机不存在")
		return
	}
	response.OK(c, gin.H{
		"id":         host.ID,
		"type":       host.Type,
		"name":       host.Name,
		"code":       host.Code,
		"address":    host.Address,
		"port":       host.Port,
		"status":     host.Status,
		"tags":       parseTags(host.Tags),
		"remark":     host.Remark,
		"identityId": host.IdentityID,
		"createTime": timeToMs(host.CreateTime),
		"updateTime": timeToMs(host.UpdateTime),
		"creator":    host.Creator,
	})
}

// ListHosts GET /asset/host/list?type=
func (a *CompatAPI) ListHosts(c *gin.Context) {
	hostType := c.Query("type")
	listReq := &model.HostListRequest{
		Page:     1,
		PageSize: 1000,
		Type:     hostType,
	}
	hosts, _, err := a.hostSvc.List(listReq)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	result := make([]gin.H, 0, len(hosts))
	for _, h := range hosts {
		result = append(result, gin.H{
			"id":      h.ID,
			"type":    h.Type,
			"name":    h.Name,
			"code":    h.Code,
			"address": h.Address,
			"port":    h.Port,
			"status":  h.Status,
			"tags":    parseTags(h.Tags),
		})
	}
	response.OK(c, result)
}

// CreateHost POST /asset/host/create
func (a *CompatAPI) CreateHost(c *gin.Context) {
	var req struct {
		Types       []string `json:"types"`
		Name        string   `json:"name"`
		Code        string   `json:"code"`
		Address     string   `json:"address"`
		Port        int      `json:"port"`
		OsType      string   `json:"osType"`
		Description string   `json:"description"`
		Tags        []int    `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	hostType := "SSH"
	if len(req.Types) > 0 {
		hostType = req.Types[0]
	}
	username, _ := c.Get("username")
	createReq := &model.HostCreateRequest{
		Type:    hostType,
		Name:    req.Name,
		Code:    req.Code,
		Address: req.Address,
		Port:    req.Port,
		Remark:  req.Description,
	}
	host, err := a.hostSvc.Create(createReq, username.(string))
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, host.ID)
}

// UpdateHost PUT /asset/host/update
func (a *CompatAPI) UpdateHost(c *gin.Context) {
	var req struct {
		ID          int64    `json:"id" binding:"required"`
		Name        string   `json:"name"`
		Address     string   `json:"address"`
		Port        int      `json:"port"`
		Description string   `json:"description"`
		Tags        []int    `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	updateReq := &model.HostUpdateRequest{
		Name:    req.Name,
		Address: req.Address,
		Port:    req.Port,
		Remark:  req.Description,
	}
	if err := a.hostSvc.Update(req.ID, updateReq); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// UpdateHostStatus PUT /asset/host/update-status
func (a *CompatAPI) UpdateHostStatus(c *gin.Context) {
	var req struct {
		ID     int64 `json:"id" binding:"required"`
		Status int8  `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	updateReq := &model.HostUpdateRequest{Status: &req.Status}
	if err := a.hostSvc.Update(req.ID, updateReq); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeleteHost DELETE /asset/host/delete?id=
func (a *CompatAPI) DeleteHost(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Query("id"), 10, 64)
	if err := a.hostSvc.Delete(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// ========== /asset/host-identity ==========

// QueryHostIdentities POST /asset/host-identity/query
func (a *CompatAPI) QueryHostIdentities(c *gin.Context) {
	var req struct {
		Page  int    `json:"page"`
		Limit int    `json:"limit"`
		Name  string `json:"name"`
	}
	c.ShouldBindJSON(&req)
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.Limit <= 0 {
		req.Limit = 20
	}
	identities, err := a.identitySvc.List()
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	// 简单分页
	total := int64(len(identities))
	start := (req.Page - 1) * req.Limit
	if start > int(total) {
		start = int(total)
	}
	end := start + req.Limit
	if end > int(total) {
		end = int(total)
	}
	response.OKPage(c, total, identities[start:end])
}

// ListHostIdentities GET /asset/host-identity/list
func (a *CompatAPI) ListHostIdentities(c *gin.Context) {
	identities, err := a.identitySvc.List()
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, identities)
}

// ========== /asset/host-group ==========

// GetHostGroupTree GET /asset/host-group/tree
func (a *CompatAPI) GetHostGroupTree(c *gin.Context) {
	groups, err := a.groupSvc.List()
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	// 构建树结构
	tree := buildGroupTree(groups, 0)
	response.OK(c, tree)
}

func buildGroupTree(groups []model.HostGroup, parentID int64) []gin.H {
	var result []gin.H
	for _, g := range groups {
		if g.ParentID == parentID {
			children := buildGroupTree(groups, g.ID)
			node := gin.H{
				"id":       g.ID,
				"parentId": g.ParentID,
				"name":     g.Name,
				"sort":     g.Sort,
				"children": children,
			}
			result = append(result, node)
		}
	}
	if result == nil {
		result = []gin.H{}
	}
	return result
}

// ========== /asset/authorized-data ==========

// GetCurrentAuthorizedHosts GET /asset/authorized-data/current-host
// 返回当前用户有权限访问的主机列表
func (a *CompatAPI) GetCurrentAuthorizedHosts(c *gin.Context) {
	// 简化实现：返回所有启用的主机
	listReq := &model.HostListRequest{Page: 1, PageSize: 1000}
	hosts, _, _ := a.hostSvc.List(listReq)
	result := make([]gin.H, 0, len(hosts))
	for _, h := range hosts {
		result = append(result, gin.H{
			"id":      h.ID,
			"type":    h.Type,
			"name":    h.Name,
			"code":    h.Code,
			"address": h.Address,
			"port":    h.Port,
			"status":  h.Status,
			"tags":    parseTags(h.Tags),
		})
	}
	response.OK(c, result)
}

// ========== /terminal/terminal ==========

// TerminalAccess POST /terminal/terminal/access
// 前端请求终端访问权限，返回 accessToken (string)
// accessToken 格式: base64(hostId|jwt) - 用于 WS 连接鉴权
func (a *CompatAPI) TerminalAccess(c *gin.Context) {
	var req struct {
		HostID      int64             `json:"hostId"`
		ConnectType string            `json:"connectType"`
		Extra       map[string]string `json:"extra"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if _, err := a.hostSvc.GetByID(req.HostID); err != nil {
		response.Fail(c, "主机不存在")
		return
	}
	userID := c.GetInt64("userId")
	jwt, _ := middleware.GenerateToken(userID, c.GetString("username"))
	accessToken := EncodeAccessToken(req.HostID, jwt)
	// 前端期望 data 直接是 string
	response.OK(c, accessToken)
}

// EncodeAccessToken 编码 accessToken: hostId|jwt → base64
func EncodeAccessToken(hostID int64, jwt string) string {
	raw := strconv.FormatInt(hostID, 10) + "|" + jwt
	return strings.ReplaceAll(
		strings.ReplaceAll(
			strings.TrimRight(
				base64Encode(raw), "="),
			"+", "-"),
		"/", "_")
}

// DecodeAccessToken 解码 accessToken → hostId, jwt
func DecodeAccessToken(token string) (int64, string, error) {
	// 恢复 base64 padding
	token = strings.ReplaceAll(strings.ReplaceAll(token, "-", "+"), "_", "/")
	if m := len(token) % 4; m != 0 {
		token += strings.Repeat("=", 4-m)
	}
	raw, err := base64Decode(token)
	if err != nil {
		return 0, "", err
	}
	parts := strings.SplitN(raw, "|", 2)
	if len(parts) != 2 {
		return 0, "", fmt.Errorf("invalid access token")
	}
	hostID, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, "", err
	}
	return hostID, parts[1], nil
}

func base64Encode(s string) string {
	return base64.StdEncoding.EncodeToString([]byte(s))
}

func base64Decode(s string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(s)
	return string(data), err
}

// ========== /terminal/terminal/themes ==========

// GetTerminalThemes GET /terminal/terminal/themes
func (a *CompatAPI) GetTerminalThemes(c *gin.Context) {
	// 返回默认主题列表
	themes := []gin.H{
		{
			"name":       "dark",
			"dark":       true,
			"background": "#1e1e1e",
			"foreground": "#d4d4d4",
			"cursor":     "#d4d4d4",
		},
		{
			"name":       "light",
			"dark":       false,
			"background": "#ffffff",
			"foreground": "#000000",
			"cursor":     "#000000",
		},
	}
	response.OK(c, themes)
}

// ========== /terminal/command-snippet ==========

// ListCommandSnippetGroups GET /terminal/command-snippet-group/list
func (a *CompatAPI) ListCommandSnippetGroups(c *gin.Context) {
	response.OK(c, []gin.H{})
}

// ========== /terminal/statistics ==========

// GetWorkplaceStatistics GET /terminal/statistics/get-workplace
func (a *CompatAPI) GetWorkplaceStatistics(c *gin.Context) {
	response.OK(c, gin.H{
		"hostCount":       0,
		"connectCount":    0,
		"commandCount":    0,
		"onlineUserCount": 0,
	})
}

// ========== /infra/system-user ==========

// QueryUsers POST /infra/system-user/query
func (a *CompatAPI) QueryUsers(c *gin.Context) {
	var req struct {
		Page     int    `json:"page"`
		Limit    int    `json:"limit"`
		Username string `json:"username"`
		Nickname string `json:"nickname"`
		Status   *int8  `json:"status"`
	}
	c.ShouldBindJSON(&req)
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.Limit <= 0 {
		req.Limit = 20
	}
	listReq := &model.UserListRequest{
		Page:     req.Page,
		PageSize: req.Limit,
		Username: req.Username,
		Nickname: req.Nickname,
		Status:   req.Status,
	}
	users, total, err := a.userSvc.List(listReq)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OKPage(c, total, users)
}

// ========== /infra/system-message ==========

// HasUnreadMessage GET /infra/system-message/has-unread
func (a *CompatAPI) HasUnreadMessage(c *gin.Context) {
	response.OK(c, false)
}

// GetMessageCount GET /infra/system-message/count
func (a *CompatAPI) GetMessageCount(c *gin.Context) {
	response.OK(c, gin.H{})
}

// ========== helpers ==========

func parseTags(tags string) []string {
	if tags == "" {
		return []string{}
	}
	return strings.Split(tags, ",")
}

func timeToMs(t interface{}) int64 {
	switch v := t.(type) {
	case time.Time:
		return v.UnixMilli()
	case *time.Time:
		if v != nil {
			return v.UnixMilli()
		}
		return 0
	case int64:
		return v
	default:
		return 0
	}
}
