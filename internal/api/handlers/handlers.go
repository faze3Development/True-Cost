// Package handlers implements the Gin HTTP route handlers for the True Cost API.
package handlers

import (
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/internal/models"
)

// Handler groups route handler methods and their dependencies.
type Handler struct {
	DB *gorm.DB
}

// New returns an initialised Handler.
func New(db *gorm.DB) *Handler {
	return &Handler{DB: db}
}

// ---------------------------------------------------------------------------
// GET /api/v1/properties
// ---------------------------------------------------------------------------

// ListProperties returns a list of properties filtered by optional ?city= and
// ?state= query parameters.
func (h *Handler) ListProperties(c *gin.Context) {
	city := c.Query("city")
	state := c.Query("state")

	query := h.DB.Model(&models.Property{})
	if city != "" {
		query = query.Where("city ILIKE ?", city)
	}
	if state != "" {
		query = query.Where("state ILIKE ?", state)
	}

	var properties []models.Property
	if err := query.Find(&properties).Error; err != nil {
		slog.Error("ListProperties: db query failed", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch properties"})
		return
	}

	c.JSON(http.StatusOK, properties)
}

// ---------------------------------------------------------------------------
// GET /api/v1/properties/:id
// ---------------------------------------------------------------------------

// GetProperty returns a single property together with its FeeStructure.
func (h *Handler) GetProperty(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid property id"})
		return
	}

	var property models.Property
	result := h.DB.Preload("FeeStructure").First(&property, id)
	if result.Error != nil {
		if isNotFound(result.Error) {
			c.JSON(http.StatusNotFound, gin.H{"error": "property not found"})
			return
		}
		slog.Error("GetProperty: db query failed",
			slog.Uint64("property_id", id),
			slog.String("error", result.Error.Error()),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch property"})
		return
	}

	c.JSON(http.StatusOK, property)
}

// ---------------------------------------------------------------------------
// GET /api/v1/properties/:id/units
// ---------------------------------------------------------------------------

// ListUnits returns all units for a given property. Results can be filtered by
// the optional ?beds= query parameter (supports fractional values, e.g. 0.5
// for a studio-den).
func (h *Handler) ListUnits(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid property id"})
		return
	}

	query := h.DB.Where("property_id = ?", id)

	if bedsStr := c.Query("beds"); bedsStr != "" {
		beds, err := strconv.ParseFloat(bedsStr, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "beds must be a number"})
			return
		}
		query = query.Where("bedrooms = ?", beds)
	}

	var units []models.Unit
	if err := query.Find(&units).Error; err != nil {
		slog.Error("ListUnits: db query failed",
			slog.Uint64("property_id", id),
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch units"})
		return
	}

	c.JSON(http.StatusOK, units)
}

// ---------------------------------------------------------------------------
// GET /api/v1/units/:id/history
// ---------------------------------------------------------------------------

// GetUnitHistory returns a time-series of PriceRecord objects for a given unit.
// The optional ?days= query parameter limits results to the last N days
// (defaults to 30). Each record includes a computed true_cost field.
//
// true_cost = EffectiveRent + TrashFee + AmenityFee + PackageFee
func (h *Handler) GetUnitHistory(c *gin.Context) {
	unitID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid unit id"})
		return
	}

	days := 30
	if daysStr := c.Query("days"); daysStr != "" {
		d, err := strconv.Atoi(daysStr)
		if err != nil || d <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "days must be a positive integer"})
			return
		}
		days = d
	}

	since := time.Now().UTC().AddDate(0, 0, -days)

	var records []models.PriceRecord
	if err := h.DB.
		Where("unit_id = ? AND date_scraped >= ?", unitID, since).
		Order("date_scraped ASC").
		Find(&records).Error; err != nil {
		slog.Error("GetUnitHistory: db query failed",
			slog.Uint64("unit_id", unitID),
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch price history"})
		return
	}

	// Fetch the fee structure for the unit's property so we can calculate true_cost.
	var unit models.Unit
	if err := h.DB.First(&unit, unitID).Error; err != nil {
		if isNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "unit not found"})
			return
		}
		slog.Error("GetUnitHistory: fetch unit failed",
			slog.Uint64("unit_id", unitID),
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch unit"})
		return
	}

	// Fetch the property's fee structure. If none exists (e.g. data not yet
	// populated), fees default to zero and true_cost equals effective_rent.
	var feeStructure models.FeeStructure
	if err := h.DB.Where("property_id = ?", unit.PropertyID).First(&feeStructure).Error; err != nil {
		if !isNotFound(err) {
			slog.Warn("GetUnitHistory: fee structure query failed, defaulting fees to zero",
				slog.Uint64("property_id", uint64(unit.PropertyID)),
				slog.String("error", err.Error()),
			)
		}
		// Continue with zero-value feeStructure so true_cost is still calculated.
	}

	// Compute true_cost for every record before returning.
	for i := range records {
		records[i].TrueCost = records[i].EffectiveRent +
			feeStructure.TrashFee +
			feeStructure.AmenityFee +
			feeStructure.PackageFee
	}

	c.JSON(http.StatusOK, records)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// parseIDParam parses a URL path parameter as a uint64 database ID.
// It returns an error if the value is not a valid positive integer.
func parseIDParam(c *gin.Context, param string) (uint64, error) {
	return strconv.ParseUint(c.Param(param), 10, 64)
}

func isNotFound(err error) bool {
	return err == gorm.ErrRecordNotFound
}
