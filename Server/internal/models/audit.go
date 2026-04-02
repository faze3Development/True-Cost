package models

import (
	"time"

	"gorm.io/gorm"
)

// SecurityEvent represents a security-relevant event stored in the database.
type SecurityEvent struct {
	gorm.Model
	TenantKey    string    `gorm:"not null;default:'default';index" json:"tenant_key"`
	EventType     string    `gorm:"not null;index" json:"event_type"`
	Severity      string    `gorm:"not null"       json:"severity"`
	UserID        *string   `gorm:"index"          json:"user_id,omitempty"`
	CorrelationID *string   `gorm:"index"          json:"correlation_id,omitempty"`
	IPAddress     *string   `json:"ip_address,omitempty"`
	UserAgent     *string   `json:"user_agent,omitempty"`
	EventData     string    `gorm:"type:text"      json:"event_data,omitempty"` // Stored as JSON string
	Timestamp     time.Time `gorm:"not null;index" json:"timestamp"`
}
