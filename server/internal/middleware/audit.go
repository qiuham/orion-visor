package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/orion-visor/server/internal/model"
	"gorm.io/gorm"
)

var auditDB *gorm.DB

// InitAudit 初始化审计日志中间件
func InitAudit(db *gorm.DB) {
	auditDB = db
}

// AuditLog 自动记录操作审计日志的中间件
func AuditLog(module, opType string, riskLevel int8) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// 读取请求体
		var param string
		if c.Request.Body != nil {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			if len(bodyBytes) > 0 {
				param = string(bodyBytes)
				// 限制长度
				if len(param) > 2000 {
					param = param[:2000]
				}
			}
		}

		c.Next()

		// 记录日志
		userID := c.GetInt64("userId")
		username, _ := c.Get("username")
		usernameStr, _ := username.(string)

		result := int8(1)
		var resultMsg string
		if c.Writer.Status() >= 400 {
			result = 2
		}
		// 尝试从响应提取错误信息
		if errs := c.Errors; len(errs) > 0 {
			result = 2
			resultMsg = errs.String()
		}

		log := &model.OperationLog{
			UserID:    userID,
			Username:  usernameStr,
			Module:    module,
			Type:      opType,
			RiskLevel: riskLevel,
			Param:     param,
			Result:    result,
			ResultMsg: resultMsg,
			IP:        c.ClientIP(),
			UserAgent: c.GetHeader("User-Agent"),
			Duration:  time.Since(start).Milliseconds(),
		}

		// 脱敏：去除密码等敏感字段
		log.Param = sanitizeParam(log.Param)

		go auditDB.Create(log)
	}
}

func sanitizeParam(param string) string {
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(param), &m); err != nil {
		return param
	}
	for _, key := range []string{"password", "keyText", "passphrase", "secret"} {
		if _, ok := m[key]; ok {
			m[key] = "******"
		}
	}
	b, _ := json.Marshal(m)
	return string(b)
}
