package service

import (
	"github.com/ops-platform/server/internal/model"
	"gorm.io/gorm"
)

type TagService struct {
	db *gorm.DB
}

func NewTagService(db *gorm.DB) *TagService {
	return &TagService{db: db}
}

func (s *TagService) List() ([]model.Tag, error) {
	var tags []model.Tag
	err := s.db.Order("create_time DESC").Find(&tags).Error
	return tags, err
}

func (s *TagService) Create(req *model.TagCreateRequest) (*model.Tag, error) {
	tag := &model.Tag{
		Name:  req.Name,
		Color: req.Color,
	}
	if tag.Color == "" {
		tag.Color = "#1890ff"
	}
	err := s.db.Create(tag).Error
	return tag, err
}

func (s *TagService) Delete(id int64) error {
	return s.db.Delete(&model.Tag{}, id).Error
}
