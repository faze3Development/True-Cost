// Package api configures the Gin router and registers all application routes.
package api

import (
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/Server/internal/api/handlers"
	"github.com/faze3Development/true-cost/Server/internal/config"
)

// NewRouter creates and returns a configured *gin.Engine.
func NewRouter(db *gorm.DB, cfg *config.Config) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(requestLogger())
	
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = strings.Split(cfg.CORSAllowedOrigins, ",")
	r.Use(cors.New(corsConfig))

	h := handlers.New(db)

	v1 := r.Group("/api/v1")
	{
		v1.GET("/properties", h.ListProperties)
		v1.GET("/properties/:id", h.GetProperty)
		v1.GET("/properties/:id/units", h.ListUnits)
		v1.GET("/units/:id/history", h.GetUnitHistory)
	}

	return r
}
