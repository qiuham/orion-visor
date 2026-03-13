package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ops-platform/server/internal/model"
	"github.com/ops-platform/server/internal/service"
	"github.com/ops-platform/server/pkg/response"
)

type PreferenceAPI struct {
	prefSvc *service.PreferenceService
}

func NewPreferenceAPI(prefSvc *service.PreferenceService) *PreferenceAPI {
	return &PreferenceAPI{prefSvc: prefSvc}
}

// --- 偏好设置 ---

func (a *PreferenceAPI) GetPreferences(c *gin.Context) {
	userID := c.GetInt64("userId")
	prefType := c.DefaultQuery("type", "")
	prefs, err := a.prefSvc.GetPreferences(userID, prefType)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, prefs)
}

func (a *PreferenceAPI) SetPreference(c *gin.Context) {
	userID := c.GetInt64("userId")
	var req struct {
		Type  string `json:"type" binding:"required"`
		Item  string `json:"item" binding:"required"`
		Value string `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.prefSvc.SetPreference(userID, req.Type, req.Item, req.Value); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *PreferenceAPI) DeletePreference(c *gin.Context) {
	userID := c.GetInt64("userId")
	prefType := c.Query("type")
	item := c.Query("item")
	if prefType == "" || item == "" {
		response.Fail(c, "缺少参数")
		return
	}
	if err := a.prefSvc.DeletePreference(userID, prefType, item); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

// --- 收藏 ---

func (a *PreferenceAPI) ListFavorites(c *gin.Context) {
	userID := c.GetInt64("userId")
	favType := c.DefaultQuery("type", "")
	favs, err := a.prefSvc.ListFavorites(userID, favType)
	if err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, favs)
}

func (a *PreferenceAPI) AddFavorite(c *gin.Context) {
	userID := c.GetInt64("userId")
	var req model.FavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误")
		return
	}
	if err := a.prefSvc.AddFavorite(userID, &req); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}

func (a *PreferenceAPI) RemoveFavorite(c *gin.Context) {
	userID := c.GetInt64("userId")
	favType := c.Query("type")
	relID, _ := strconv.ParseInt(c.Query("relId"), 10, 64)
	if favType == "" || relID == 0 {
		response.Fail(c, "缺少参数")
		return
	}
	if err := a.prefSvc.RemoveFavorite(userID, favType, relID); err != nil {
		response.Fail(c, err.Error())
		return
	}
	response.OK(c, nil)
}
