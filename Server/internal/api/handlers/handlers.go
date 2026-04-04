// Package handlers implements the Gin HTTP route handlers for the True Cost API.
package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/stripe"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/user"
	"github.com/faze3Development/true-cost/Server/internal/models"
)

// Handler groups route handler methods and their dependencies.
type Handler struct {
	DB      *gorm.DB
	User    user.Service
	Stripe  *stripe.Service
	Webhook *stripe.WebhookService
}

// propertyResponse shapes property data for the map pins and listings feed.
type propertyResponse struct {
	ID                 string   `json:"id"`
	Title              string   `json:"title"`
	Neighborhood       string   `json:"neighborhood"`
	City               string   `json:"city"`
	Latitude           float64  `json:"latitude"`
	Longitude          float64  `json:"longitude"`
	AdvertisedRent     float64  `json:"advertisedRent"`
	TrueCost           float64  `json:"trueCost"`
	TotalMandatoryFees float64  `json:"totalMandatoryFees"`
	FeeDisclosure      string   `json:"feeDisclosure"`
	DealScore          float64  `json:"dealScore"`
	EstimateType       string   `json:"estimateType"`
	LegalDisclaimers   []string `json:"legalDisclaimers"`
	ImageURL           string   `json:"imageUrl,omitempty"`
	IsVerified         bool     `json:"isVerified"`
	BadgeLabel         string   `json:"badgeLabel,omitempty"`
	Insight            string   `json:"insight,omitempty"`
}

// New returns an initialised Handler.
func New(db *gorm.DB, userService user.Service, stripeSvc *stripe.Service, webhookSvc *stripe.WebhookService) *Handler {
	return &Handler{
		DB:      db,
		User:    userService,
		Stripe:  stripeSvc,
		Webhook: webhookSvc,
	}
}

// ---------------------------------------------------------------------------
// GET /api/v1/properties
// ---------------------------------------------------------------------------

// ListProperties returns a list of properties filtered by optional ?city=,
// ?state=, and ?bounds=minLon,minLat,maxLon,maxLat query parameters. Results
// are shaped for the frontend map pins and listings feed and include the
// computed true_cost (effective_rent + mandatory fees).
func (h *Handler) ListProperties(c *gin.Context) {
	city := c.Query("city")
	state := c.Query("state")
	bounds := c.Query("bounds")

	query := h.DB.Model(&models.Property{}).Preload("FeeStructure")
	if city != "" {
		query = query.Where("city ILIKE ?", city)
	}
	if state != "" {
		query = query.Where("state ILIKE ?", state)
	}

	if bounds != "" {
		b, err := parseBounds(bounds)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bounds must be minLon,minLat,maxLon,maxLat"})
			return
		}
		query = query.Where("longitude BETWEEN ? AND ? AND latitude BETWEEN ? AND ?", b.minLon, b.maxLon, b.minLat, b.maxLat)
	}

	var properties []models.Property
	if err := query.Find(&properties).Error; err != nil {
		zap.L().Error("ListProperties: db query failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch properties"})
		return
	}

	responses := make([]propertyResponse, 0, len(properties))
	for _, p := range properties {
		record := h.getLowestAdvertisedRecord(p.ID)
		deal := buildDealAnalysis(record, p.FeeStructure)

		responses = append(responses, propertyResponse{
			ID:                 p.ID,
			Title:              p.Name,
			Neighborhood:       p.City,
			City:               p.City,
			Latitude:           p.Latitude,
			Longitude:          p.Longitude,
			AdvertisedRent:     deal.AdvertisedRent,
			TrueCost:           deal.TrueCost,
			TotalMandatoryFees: deal.TotalMandatoryFees,
			FeeDisclosure:      deal.FeeDisclosure,
			DealScore:          deal.DealScore,
			EstimateType:       deal.EstimateType,
			LegalDisclaimers:   deal.LegalDisclaimers,
			ImageURL:           p.ImageURL,
			IsVerified:         p.FeeStructure.ID != "",
		})
	}

	c.JSON(http.StatusOK, responses)
}

type propertyDealAnalysisResponse struct {
	PropertyID string              `json:"propertyId"`
	Analysis   dealAnalysisPayload `json:"analysis"`
}

// GetPropertyDealAnalysis returns the multi-agent, guardrailed deal-analysis payload.
func (h *Handler) GetPropertyDealAnalysis(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid property id"})
		return
	}

	var property models.Property
	result := h.DB.Preload("FeeStructure").Where("id = ?", id).First(&property)
	if result.Error != nil {
		if isNotFound(result.Error) {
			c.JSON(http.StatusNotFound, gin.H{"error": "property not found"})
			return
		}
		zap.L().Error("GetPropertyDealAnalysis: db query failed",
			zap.String("property_id", id),
			zap.Error(result.Error),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch property"})
		return
	}

	analysis := buildDealAnalysis(h.getLowestAdvertisedRecord(property.ID), property.FeeStructure)
	c.JSON(http.StatusOK, propertyDealAnalysisResponse{
		PropertyID: property.ID,
		Analysis:   analysis,
	})
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
	result := h.DB.Preload("FeeStructure").Where("id = ?", id).First(&property)
	if result.Error != nil {
		if isNotFound(result.Error) {
			c.JSON(http.StatusNotFound, gin.H{"error": "property not found"})
			return
		}
		zap.L().Error("GetProperty: db query failed",
			zap.String("property_id", id),
			zap.Error(result.Error),
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
		zap.L().Error("ListUnits: db query failed",
			zap.String("property_id", id),
			zap.Error(err),
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
// true_cost = EffectiveRent + TrashFee + AmenityFee + PackageFee + ParkingFee
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

	zap.L().Info("GetUnitHistory: fetching historical data",
		zap.String("unit_id", unitID),
		zap.Int("days", days),
	)

	var records []models.PriceRecord
	if err := h.DB.
		Where("unit_id = ? AND date_scraped >= ?", unitID, since).
		Order("date_scraped ASC").
		Find(&records).Error; err != nil {
		zap.L().Error("GetUnitHistory: db query failed",
			zap.String("unit_id", unitID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch price history"})
		return
	}

	// Fetch the fee structure for the unit's property so we can calculate true_cost.
	var unit models.Unit
	if err := h.DB.Where("id = ?", unitID).First(&unit).Error; err != nil {
		if isNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "unit not found"})
			return
		}
		zap.L().Error("GetUnitHistory: fetch unit failed",
			zap.String("unit_id", unitID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch unit"})
		return
	}

	// Fetch the property's fee structure. If none exists (e.g. data not yet
	// populated), fees default to zero and true_cost equals effective_rent.
	var feeStructure models.FeeStructure
	if err := h.DB.Where("property_id = ?", unit.PropertyID).First(&feeStructure).Error; err != nil {
		if !isNotFound(err) {
			zap.L().Warn("GetUnitHistory: fee structure query failed, defaulting fees to zero",
				zap.String("property_id", unit.PropertyID),
				zap.Error(err),
			)
		}
		// Continue with zero-value feeStructure so true_cost is still calculated.
	}

	// Compute true_cost for every record before returning.
	for i := range records {
		records[i].TrueCost = records[i].EffectiveRent +
			feeStructure.TrashFee +
			feeStructure.AmenityFee +
			feeStructure.PackageFee +
			feeStructure.ParkingFee
	}

	c.JSON(http.StatusOK, records)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// parseIDParam parses a URL path parameter as a UUID.
// It returns the canonical UUID string, or an error if invalid.
func parseIDParam(c *gin.Context, param string) (string, error) {
	raw := strings.TrimSpace(c.Param(param))
	parsed, err := uuid.Parse(raw)
	if err != nil {
		return "", err
	}
	return parsed.String(), nil
}

func isNotFound(err error) bool {
	return err == gorm.ErrRecordNotFound
}

// computePropertyPricing returns the advertised rent and true cost for a
// property by querying the lowest advertised rent across its units. True cost
// applies the building's mandatory fees to the effective rent.
func (h *Handler) computePropertyPricing(propertyID string, totalFees float64) (float64, float64) {
	record := h.getLowestAdvertisedRecord(propertyID)

	if record.ID == "" {
		return 0, totalFees
	}

	trueCost := record.EffectiveRent + totalFees
	return record.AdvertisedRent, trueCost
}

func (h *Handler) getLowestAdvertisedRecord(propertyID string) models.PriceRecord {
	var record models.PriceRecord
	err := h.DB.
		Table("price_records").
		Joins("JOIN units ON units.id = price_records.unit_id").
		Where("units.property_id = ?", propertyID).
		Order("advertised_rent ASC").
		First(&record).Error
	if err != nil {
		if !isNotFound(err) {
			zap.L().Warn("getLowestAdvertisedRecord: price lookup failed", zap.String("property_id", propertyID), zap.Error(err))
		}
		return models.PriceRecord{}
	}

	return record
}

type bounds struct {
	minLon float64
	minLat float64
	maxLon float64
	maxLat float64
}

// parseBounds parses a comma-separated bounding box string into float values.
func parseBounds(raw string) (bounds, error) {
	parts := strings.Split(raw, ",")
	if len(parts) != 4 {
		return bounds{}, strconv.ErrSyntax
	}

	minLon, err := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
	if err != nil {
		return bounds{}, err
	}
	minLat, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
	if err != nil {
		return bounds{}, err
	}
	maxLon, err := strconv.ParseFloat(strings.TrimSpace(parts[2]), 64)
	if err != nil {
		return bounds{}, err
	}
	maxLat, err := strconv.ParseFloat(strings.TrimSpace(parts[3]), 64)
	if err != nil {
		return bounds{}, err
	}

	return bounds{minLon: minLon, minLat: minLat, maxLon: maxLon, maxLat: maxLat}, nil
}
