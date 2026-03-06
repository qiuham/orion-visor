package model

import "time"

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	SSH      SSHConfig      `mapstructure:"ssh"`
	Monitor  MonitorConfig  `mapstructure:"monitor"`
}

type ServerConfig struct {
	Port int    `mapstructure:"port"`
	Mode string `mapstructure:"mode"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	Charset  string `mapstructure:"charset"`
}

func (d *DatabaseConfig) DSN() string {
	return d.User + ":" + d.Password + "@tcp(" + d.Host + ":" +
		itoa(d.Port) + ")/" + d.DBName + "?charset=" + d.Charset +
		"&parseTime=True&loc=Local"
}

func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	s := ""
	for i > 0 {
		s = string(rune('0'+i%10)) + s
		i /= 10
	}
	return s
}

type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

func (r *RedisConfig) Addr() string {
	return r.Host + ":" + itoa(r.Port)
}

type JWTConfig struct {
	Secret string        `mapstructure:"secret"`
	Expire time.Duration `mapstructure:"expire"`
}

type SSHConfig struct {
	ConnectTimeout time.Duration `mapstructure:"connect_timeout"`
}

type MonitorConfig struct {
	Interval time.Duration `mapstructure:"interval"`
	Retain   int           `mapstructure:"retain"`
}
