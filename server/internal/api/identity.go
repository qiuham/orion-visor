package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ops-platform/server/internal/model"
	"github.com/ops-platform/server/internal/service"
	"github.com/ops-platform/server/pkg/response"
)

type IdentityAPI struct {
	identitySvc *service.IdentityService
}

func NewIdentityAPI(identitySvc *service.IdentityService) *IdentityAPI {
	return &IdentityAPI{identitySvc: identitySvc}
}

func (a *IdentityAPI) List(c *gin.Context) {
	identities, err := a.identitySvc.List()
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, identities)
}

func (a *IdentityAPI) Get(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	identity, err := a.identitySvc.GetByID(id)
	if err != nil {
		response.Fail(c, "凭证不存在")
		return
	}
	response.OK(c, identity)
}

func (a *IdentityAPI) Create(c *gin.Context) {
	var req model.HostIdentityCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	identity, err := a.identitySvc.Create(&req)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, identity)
}

func (a *IdentityAPI) Update(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req model.HostIdentityUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.identitySvc.Update(id, &req); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *IdentityAPI) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := a.identitySvc.Delete(id); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}
