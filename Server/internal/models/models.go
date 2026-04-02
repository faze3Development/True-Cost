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
	Name         string       `gorm:"not null"                   json:"name"`
	Address      string       `gorm:"not null"                   json:"address"`
	City         string       `gorm:"not null;index"             json:"city"`
	State        string       `gorm:"not null;index"             json:"state"`
	ZipCode      string       `gorm:"not null"                   json:"zip_code"`
	Latitude     float64      `gorm:"not null;default:0"          json:"latitude"`
	Longitude    float64      `gorm:"not null;default:0"          json:"longitude"`
	WebsiteURL   string       `gorm:"not null"                   json:"website_url"`
	ImageURL     string       `gorm:"type:text"                  json:"image_url"`
	Units        []Unit       `gorm:"foreignKey:PropertyID"      json:"units,omitempty"`
	FeeStructure FeeStructure `gorm:"foreignKey:PropertyID"    json:"fee_structure,omitempty"`
}

// FeeStructure holds the recurring fee breakdown for a Property.
// It belongs to exactly one Property (Has One from Property side).
type FeeStructure struct {
	gorm.Model
	PropertyID uint    `gorm:"not null;uniqueIndex"       json:"property_id"`
	TrashFee   float64 `gorm:"not null;default:0"         json:"trash_fee"`
	AmenityFee float64 `gorm:"not null;default:0"         json:"amenity_fee"`
	PackageFee float64 `gorm:"not null;default:0"         json:"package_fee"`
	ParkingFee float64 `gorm:"not null;default:0"         json:"parking_fee"`
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

// User represents an authenticated user in the system.
type User struct {
	gorm.Model
	TenantKey            string               `gorm:"not null;default:'default';index" json:"tenant_key"`
	UID                  string               `gorm:"uniqueIndex;not null" json:"uid"` // Identity provider ID (e.g. Firebase)
	Email                string               `gorm:"uniqueIndex;not null" json:"email"`
	DisplayName          string               `gorm:"not null" json:"display_name"`
	AvatarURL            string               `gorm:"type:text" json:"avatar_url"`
	Bio                  string               `gorm:"type:text" json:"bio"`
	Role                 string               `gorm:"default:'user'" json:"role"`
	TierID               string               `gorm:"default:'free'" json:"tier_id"` // Matches SubscriptionTier
	StripeCustomerID     string               `gorm:"index" json:"stripe_customer_id,omitempty"`
	StripeSubscriptionID string               `gorm:"index" json:"stripe_subscription_id,omitempty"`
	Settings             UserSettings         `gorm:"embedded;embeddedPrefix:settings_" json:"settings"`
	Alerts               []UserWatchlistAlert `gorm:"foreignKey:UserID" json:"alerts,omitempty"`
	ResourceUsage        []ResourceUsage      `gorm:"foreignKey:UserID" json:"resource_usage,omitempty"`
}

// SubscriptionTier defines the access priority and hard limits for an account tier.
type SubscriptionTier struct {
	ID         string  `gorm:"primaryKey" json:"id"` // e.g., 'free', 'pro'
	Name       string  `gorm:"not null" json:"name"`
	Priority   int     `gorm:"not null;default:0" json:"priority"`
	MaxReports int     `gorm:"not null;default:5" json:"max_reports"`
	MaxAlerts  int     `gorm:"not null;default:2" json:"max_alerts"`
	PriceMonth float64 `gorm:"not null;default:0" json:"price_month"`
}

// ResourceUsage tracks the current utilization constraints for an individual User.
type ResourceUsage struct {
	gorm.Model
	UserID       uint   `gorm:"not null;uniqueIndex:idx_user_resource" json:"user_id"`
	ResourceType string `gorm:"not null;uniqueIndex:idx_user_resource" json:"resource_type"`
	Used         int    `gorm:"not null;default:0" json:"used"`
}

// UserSettings represents embedded preferences/settings for a User.
type UserSettings struct {
	Theme              string `gorm:"default:'system'" json:"theme"`
	MapStyle           string `gorm:"default:'dark-matter'" json:"map_style"`
	EmailNotifications *bool  `gorm:"default:true" json:"email_notifications"`
	TwoFactorEnabled   *bool  `gorm:"default:false" json:"two_factor_enabled"`
	TopNavConfig       string `gorm:"type:text" json:"top_nav_config,omitempty"`
}

// UserWatchlistAlert represents a user's configured market alert.
type UserWatchlistAlert struct {
	gorm.Model
	UserID   uint   `gorm:"not null;index" json:"user_id"`
	Title    string `gorm:"not null"       json:"title"`
	Detail   string `gorm:"not null"       json:"detail"`
	IsActive *bool  `gorm:"default:true"   json:"is_active"`
	Featured *bool  `gorm:"default:false"  json:"featured"`
}

// SystemSetting represents a global configuration key-value pair for the application.
type SystemSetting struct {
	gorm.Model
	TenantKey   string `gorm:"not null;default:'default';uniqueIndex:ux_system_settings_tenant_key_key" json:"tenant_key"`
	Key         string `gorm:"not null;uniqueIndex:ux_system_settings_tenant_key_key" json:"key"`
	Value       string `gorm:"type:text;not null"   json:"value"`
	Description string `gorm:"type:text"            json:"description"`
}

// AdminNavConfig stores the canonical admin-managed top navigation layout.
type AdminNavConfig struct {
	gorm.Model
	TenantKey    string `gorm:"not null;default:'default';uniqueIndex:ux_admin_nav_configs_tenant_key_scope" json:"tenant_key"`
	Scope        string `gorm:"not null;uniqueIndex:ux_admin_nav_configs_tenant_key_scope" json:"scope"`
	ConfigJSON   string `gorm:"type:text;not null"   json:"config_json"`
	UpdatedByUID string `gorm:"index"                json:"updated_by_uid,omitempty"`
}

// AdminSetting stores admin-managed runtime settings with ownership metadata.
type AdminSetting struct {
	gorm.Model
	TenantKey    string `gorm:"not null;default:'default';uniqueIndex:ux_admin_settings_tenant_key_key" json:"tenant_key"`
	Key          string `gorm:"not null;uniqueIndex:ux_admin_settings_tenant_key_key" json:"key"`
	Value        string `gorm:"type:text;not null"   json:"value"`
	Description  string `gorm:"type:text"            json:"description"`
	UpdatedByUID string `gorm:"index"               json:"updated_by_uid,omitempty"`
}
