package service

import (
	"crypto/md5"
	"encoding/hex"
	"errors"

	"github.com/ops-platform/server/internal/model"
	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

func (s *UserService) Login(req *model.LoginRequest) (*model.User, error) {
	var user model.User
	if err := s.db.Where("username = ?", req.Username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	if user.Status != 1 {
		return nil, errors.New("user is disabled")
	}
	if !checkPassword(req.Password, user.Password) {
		return nil, errors.New("wrong password")
	}
	return &user, nil
}

func (s *UserService) GetByID(id int64) (*model.User, error) {
	var user model.User
	if err := s.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// List 用户列表（分页）
func (s *UserService) List(req *model.UserListRequest) ([]model.User, int64, error) {
	var users []model.User
	var total int64

	q := s.db.Model(&model.User{})
	if req.Username != "" {
		q = q.Where("username LIKE ?", "%"+req.Username+"%")
	}
	if req.Nickname != "" {
		q = q.Where("nickname LIKE ?", "%"+req.Nickname+"%")
	}
	if req.Status != nil {
		q = q.Where("status = ?", *req.Status)
	}
	q.Count(&total)

	offset := (req.Page - 1) * req.PageSize
	err := q.Order("id ASC").Offset(offset).Limit(req.PageSize).Find(&users).Error
	return users, total, err
}

// Create 创建用户
func (s *UserService) Create(req *model.UserCreateRequest) (*model.User, error) {
	h := md5.Sum([]byte(req.Password))
	user := model.User{
		Username: req.Username,
		Password: hex.EncodeToString(h[:]),
		Nickname: req.Nickname,
		Mobile:   req.Mobile,
		Email:    req.Email,
		Status:   1,
	}
	if err := s.db.Create(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// Update 更新用户信息
func (s *UserService) Update(id int64, req *model.UserUpdateRequest) error {
	updates := map[string]interface{}{}
	if req.Nickname != "" {
		updates["nickname"] = req.Nickname
	}
	if req.Mobile != "" {
		updates["mobile"] = req.Mobile
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	if len(updates) == 0 {
		return errors.New("没有要更新的字段")
	}
	return s.db.Model(&model.User{}).Where("id = ?", id).Updates(updates).Error
}

// Delete 删除用户
func (s *UserService) Delete(id int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		tx.Where("user_id = ?", id).Delete(&model.UserRole{})
		return tx.Delete(&model.User{}, id).Error
	})
}

// UpdatePassword 更新密码
func (s *UserService) UpdatePassword(id int64, hashedPassword string) error {
	return s.db.Model(&model.User{}).Where("id = ?", id).Update("password", hashedPassword).Error
}

// checkPassword verifies the password against the stored hash.
// MD5 hashing (legacy compatibility).
func checkPassword(input, stored string) bool {
	h := md5.Sum([]byte(input))
	return hex.EncodeToString(h[:]) == stored
}
