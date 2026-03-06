package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Result struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type PageResult struct {
	Total int64       `json:"total"`
	Rows  interface{} `json:"rows"`
}

func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Result{Code: 0, Message: "ok", Data: data})
}

func OKPage(c *gin.Context, total int64, rows interface{}) {
	c.JSON(http.StatusOK, Result{Code: 0, Message: "ok", Data: PageResult{Total: total, Rows: rows}})
}

func Fail(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, Result{Code: -1, Message: msg})
}

func Unauthorized(c *gin.Context, msg string) {
	c.JSON(http.StatusUnauthorized, Result{Code: 401, Message: msg})
}

func Forbidden(c *gin.Context, msg string) {
	c.JSON(http.StatusForbidden, Result{Code: 403, Message: msg})
}
