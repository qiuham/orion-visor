package service

import (
	"errors"

	"github.com/ops-platform/server/internal/model"
	"gorm.io/gorm"
)

type RoleService struct {
	db *gorm.DB
}

func NewRoleService(db *gorm.DB) *RoleService {
	return &RoleService{db: db}
}

func (s *RoleService) List() ([]model.Role, error) {
	var roles []model.Role
	err := s.db.Order("sort ASC, id ASC").Find(&roles).Error
	return roles, err
}

func (s *RoleService) GetByID(id int64) (*model.Role, error) {
	var role model.Role
	if err := s.db.First(&role, id).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

func (s *RoleService) Create(req *model.RoleCreateRequest) (*model.Role, error) {
	role := model.Role{
		Name:   req.Name,
		Code:   req.Code,
		Status: 1,
		Sort:   req.Sort,
		Remark: req.Remark,
	}
	if err := s.db.Create(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

func (s *RoleService) Update(id int64, req *model.RoleUpdateRequest) error {
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Sort > 0 {
		updates["sort"] = req.Sort
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}
	if len(updates) == 0 {
		return errors.New("没有要更新的字段")
	}
	return s.db.Model(&model.Role{}).Where("id = ?", id).Updates(updates).Error
}

func (s *RoleService) Delete(id int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		tx.Where("role_id = ?", id).Delete(&model.RoleMenu{})
		tx.Where("role_id = ?", id).Delete(&model.UserRole{})
		return tx.Delete(&model.Role{}, id).Error
	})
}

// GetRoleMenus 获取角色的菜单 ID 列表
func (s *RoleService) GetRoleMenus(roleID int64) ([]int64, error) {
	var menuIDs []int64
	err := s.db.Model(&model.RoleMenu{}).Where("role_id = ?", roleID).Pluck("menu_id", &menuIDs).Error
	return menuIDs, err
}

// UpdateRoleMenus 更新角色的菜单权限
func (s *RoleService) UpdateRoleMenus(roleID int64, menuIDs []int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		tx.Where("role_id = ?", roleID).Delete(&model.RoleMenu{})
		for _, menuID := range menuIDs {
			if err := tx.Create(&model.RoleMenu{RoleID: roleID, MenuID: menuID}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// GetUserRoles 获取用户的角色 ID 列表
func (s *RoleService) GetUserRoles(userID int64) ([]int64, error) {
	var roleIDs []int64
	err := s.db.Model(&model.UserRole{}).Where("user_id = ?", userID).Pluck("role_id", &roleIDs).Error
	return roleIDs, err
}

// UpdateUserRoles 更新用户的角色
func (s *RoleService) UpdateUserRoles(userID int64, roleIDs []int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		tx.Where("user_id = ?", userID).Delete(&model.UserRole{})
		for _, roleID := range roleIDs {
			if err := tx.Create(&model.UserRole{UserID: userID, RoleID: roleID}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// GetUserPermissions 获取用户所有权限标识
func (s *RoleService) GetUserPermissions(userID int64) ([]string, error) {
	var permissions []string
	err := s.db.Model(&model.Menu{}).
		Joins("JOIN system_role_menu ON system_role_menu.menu_id = system_menu.id").
		Joins("JOIN system_user_role ON system_user_role.role_id = system_role_menu.role_id").
		Where("system_user_role.user_id = ? AND system_menu.permission != '' AND system_menu.status = 1", userID).
		Pluck("system_menu.permission", &permissions).Error
	return permissions, err
}

// GetMenuList 获取全部菜单列表
func (s *RoleService) GetMenuList() ([]model.Menu, error) {
	var menus []model.Menu
	err := s.db.Order("sort ASC, id ASC").Find(&menus).Error
	return menus, err
}

// GetUserRolesDetail 获取用户角色详情（含 code）
func (s *RoleService) GetUserRolesDetail(userID int64) ([]model.Role, error) {
	var roles []model.Role
	err := s.db.Model(&model.Role{}).
		Joins("JOIN system_user_role ON system_user_role.role_id = system_role.id").
		Where("system_user_role.user_id = ?", userID).
		Find(&roles).Error
	return roles, err
}

// ListAllMenus 获取全部菜单
func (s *RoleService) ListAllMenus() ([]model.Menu, error) {
	return s.GetMenuList()
}

// GetUserMenus 获取用户可访问的菜单
func (s *RoleService) GetUserMenus(userID int64) ([]model.Menu, error) {
	var menus []model.Menu
	err := s.db.Model(&model.Menu{}).
		Joins("JOIN system_role_menu ON system_role_menu.menu_id = system_menu.id").
		Joins("JOIN system_user_role ON system_user_role.role_id = system_role_menu.role_id").
		Where("system_user_role.user_id = ? AND system_menu.status = 1", userID).
		Order("system_menu.sort ASC, system_menu.id ASC").
		Distinct().
		Find(&menus).Error
	return menus, err
}

// IsAdmin 检查用户是否是管理员（拥有 admin 角色）
func (s *RoleService) IsAdmin(userID int64) bool {
	var count int64
	s.db.Model(&model.UserRole{}).
		Joins("JOIN system_role ON system_role.id = system_user_role.role_id").
		Where("system_user_role.user_id = ? AND system_role.code = ?", userID, "admin").
		Count(&count)
	return count > 0
}
