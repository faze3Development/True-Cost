// Package models defines the GORM database models for the True Cost application.
package models

import (
	"time"

	"gorm.io/gorm"
)

// Property represents a rental property (apartment complex or building).
// It has many Units and one FeeStructure.
type Property struct {
	gorm.Model
	Name        string      `gorm:"not null"                   json:"name"`
	Address     string      `gorm:"not null"                   json:"address"`
	City        string      `gorm:"not null;index"             json:"city"`
	State       string      `gorm:"not null;index"             json:"state"`
	ZipCode     string      `gorm:"not null"                   json:"zip_code"`
	WebsiteURL  string      `gorm:"not null"                   json:"website_url"`
	Units       []Unit      `gorm:"foreignKey:PropertyID"      json:"units,omitempty"`
	FeeStructure FeeStructure `gorm:"foreignKey:PropertyID"    json:"fee_structure,omitempty"`
}

// FeeStructure holds the recurring fee breakdown for a Property.
// It belongs to exactly one Property (Has One from Property side).
type FeeStructure struct {
	gorm.Model
	PropertyID  uint    `gorm:"not null;uniqueIndex"       json:"property_id"`
	TrashFee    float64 `gorm:"not null;default:0"         json:"trash_fee"`
	AmenityFee  float64 `gorm:"not null;default:0"         json:"amenity_fee"`
	PackageFee  float64 `gorm:"not null;default:0"         json:"package_fee"`
	ParkingFee  float64 `gorm:"not null;default:0"         json:"parking_fee"`
}

// Unit represents a specific unit or floorplan within a Property.
// It has many PriceRecords.
type Unit struct {
	gorm.Model
	PropertyID    uint          `gorm:"not null;index"             json:"property_id"`
	UnitNumber    string        `gorm:"not null"                   json:"unit_number"`
	FloorplanName string        `gorm:"not null"                   json:"floorplan_name"`
	Bedrooms      float64       `gorm:"not null"                   json:"bedrooms"`
	Bathrooms     float64       `gorm:"not null"                   json:"bathrooms"`
	SquareFeet    int           `gorm:"not null"                   json:"square_feet"`
	PriceRecords  []PriceRecord `gorm:"foreignKey:UnitID"          json:"price_records,omitempty"`
}

// PriceRecord is a single scraped data point for a Unit on a specific day.
// Both UnitID and DateScraped are individually indexed for efficient querying.
type PriceRecord struct {
	gorm.Model
	UnitID          uint      `gorm:"not null;index"             json:"unit_id"`
	DateScraped     time.Time `gorm:"not null;index"             json:"date_scraped"`
	AdvertisedRent  float64   `gorm:"not null"                   json:"advertised_rent"`
	ConcessionText  string    `gorm:"type:text"                  json:"concession_text"`
	EffectiveRent   float64   `gorm:"not null"                   json:"effective_rent"`
	IsAvailable     bool      `gorm:"not null;default:true"      json:"is_available"`
	Source          string    `gorm:"not null"                   json:"source"`
	ConfidenceScore int       `gorm:"not null;default:0"         json:"confidence_score"`
	// TrueCost is computed at query time and is NOT stored in the database.
	TrueCost float64 `gorm:"-" json:"true_cost,omitempty"`
}
