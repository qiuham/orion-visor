package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Result 统一响应格式 (兼容前端 orion-visor-ui 的约定)
// 前端 interceptor 期望: {code: 200, msg: "ok", data: ...}
type Result struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data,omitempty"`
}

type PageResult struct {
	Total int64       `json:"total"`
	Rows  interface{} `json:"rows"`
}

func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Result{Code: 200, Msg: "ok", Data: data})
}

func OKPage(c *gin.Context, total int64, rows interface{}) {
	c.JSON(http.StatusOK, Result{Code: 200, Msg: "ok", Data: PageResult{Total: total, Rows: rows}})
}

func Fail(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, Result{Code: 500, Msg: msg})
}

func Unauthorized(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, Result{Code: 401, Msg: msg})
}

func Forbidden(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, Result{Code: 403, Msg: msg})
}
