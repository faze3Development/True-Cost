// Package api configures the Gin router and registers all application routes.
package api

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/internal/api/handlers"
)

// NewRouter creates and returns a configured *gin.Engine.
func NewRouter(db *gorm.DB) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(requestLogger())

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
