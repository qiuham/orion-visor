package service

import (
	"crypto/md5"
	"encoding/hex"
	"errors"

	"github.com/orion-visor/server/internal/model"
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

// checkPassword verifies the password against the stored hash.
// orion-visor uses MD5 hashing (legacy), we keep compatibility.
func checkPassword(input, stored string) bool {
	h := md5.Sum([]byte(input))
	return hex.EncodeToString(h[:]) == stored
}
