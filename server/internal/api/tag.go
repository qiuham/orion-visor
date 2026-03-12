package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/model"
	"github.com/orion-visor/server/internal/service"
	"github.com/orion-visor/server/pkg/response"
)

type TagAPI struct {
	tagSvc *service.TagService
}

func NewTagAPI(tagSvc *service.TagService) *TagAPI {
	return &TagAPI{tagSvc: tagSvc}
}

func (a *TagAPI) List(c *gin.Context) {
	tags, err := a.tagSvc.List()
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, tags)
}

func (a *TagAPI) Create(c *gin.Context) {
	var req model.TagCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	tag, err := a.tagSvc.Create(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, tag)
}

func (a *TagAPI) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.tagSvc.Delete(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}
