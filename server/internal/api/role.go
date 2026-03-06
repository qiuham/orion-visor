package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	"github.com/orion-visor/server/pkg/response"
)

type RoleAPI struct {
	roleSvc *service.RoleService
}

func NewRoleAPI(roleSvc *service.RoleService) *RoleAPI {
	return &RoleAPI{roleSvc: roleSvc}
}

func (a *RoleAPI) List(c *gin.Context) {
	roles, err := a.roleSvc.List()
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, roles)
}

func (a *RoleAPI) Get(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	role, err := a.roleSvc.GetByID(id)
	if err != nil {
		response.Fail(c, "角色不存在")
		return
	}
	response.OK(c, role)
}

func (a *RoleAPI) Create(c *gin.Context) {
	var req model.RoleCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	role, err := a.roleSvc.Create(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, role)
}

func (a *RoleAPI) Update(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req model.RoleUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.roleSvc.Update(id, &req); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *RoleAPI) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.roleSvc.Delete(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// GetRoleMenus 获取角色菜单权限
func (a *RoleAPI) GetRoleMenus(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	menuIDs, err := a.roleSvc.GetRoleMenus(id)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, menuIDs)
}

// UpdateRoleMenus 更新角色菜单权限
func (a *RoleAPI) UpdateRoleMenus(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req model.RoleMenuUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.roleSvc.UpdateRoleMenus(id, req.MenuIDs); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// MenuList 获取全部菜单
func (a *RoleAPI) MenuList(c *gin.Context) {
	menus, err := a.roleSvc.GetMenuList()
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, menus)
}

// GetUserRoles 获取用户角色
func (a *RoleAPI) GetUserRoles(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	roleIDs, err := a.roleSvc.GetUserRoles(id)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, roleIDs)
}

// UpdateUserRoles 更新用户角色
func (a *RoleAPI) UpdateUserRoles(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req model.UserRoleUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.roleSvc.UpdateUserRoles(id, req.RoleIDs); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// GetCurrentUserPermissions 获取当前用户权限
func (a *RoleAPI) GetCurrentUserPermissions(c *gin.Context) {
	userID := c.GetInt64("userId")
	permissions, err := a.roleSvc.GetUserPermissions(userID)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, permissions)
}
