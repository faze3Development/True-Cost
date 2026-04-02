package audit

import (
	"context"
	"encoding/json"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/dbctx"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/logging"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/tenant"
	"github.com/faze3Development/true-cost/Server/internal/models"
)

// EventType represents the type of security event
type EventType string

const (
	// Authentication events
	EventAuthenticationSuccess EventType = "authentication_success"
	EventAuthenticationFailed  EventType = "authentication_failed"
	EventTokenRevoked          EventType = "token_revoked"
	EventTokenExpired          EventType = "token_expired"

	// Authorization events
	EventAuthorizationDenied EventType = "authorization_denied"
	EventInactiveUserAccess  EventType = "inactive_user_access"

	// Rate limiting events
	EventRateLimitExceeded EventType = "rate_limit_exceeded"

	// Admin actions
	EventAdminUserSuspended EventType = "admin_action_user_suspended"
	EventAdminTierChanged   EventType = "admin_action_tier_changed"

	// Suspicious activity
	EventSuspiciousActivity EventType = "suspicious_activity"
)

// Severity represents the severity level of a security event
type Severity string

const (
	SeverityInfo     Severity = "info"
	SeverityWarning  Severity = "warning"
	SeverityError    Severity = "error"
	SeverityCritical Severity = "critical"
)

// SecurityEvent represents a security-relevant event
type SecurityEvent struct {
	TenantKey     string                 `json:"tenant_key,omitempty"`
	EventType     EventType              `json:"event_type"`
	Severity      Severity               `json:"severity"`
	UserID        string                 `json:"user_id,omitempty"`
	CorrelationID string                 `json:"correlation_id,omitempty"`
	IPAddress     string                 `json:"ip_address,omitempty"`
	UserAgent     string                 `json:"user_agent,omitempty"`
	EventData     map[string]interface{} `json:"event_data,omitempty"`
	Timestamp     time.Time              `json:"timestamp"`
}

// AdminAction represents an administrative action
type AdminAction struct {
	AdminID      string                 `json:"admin_id"`
	ActionType   string                 `json:"action_type"`
	TargetUser   string                 `json:"target_user"`
	PreviousData map[string]interface{} `json:"previous_data,omitempty"`
	NewData      map[string]interface{} `json:"new_data,omitempty"`
	Reason       string                 `json:"reason,omitempty"`
	Timestamp    time.Time              `json:"timestamp"`
}

// AuditLogger handles security event logging
type AuditLogger struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewAuditLogger creates a new audit logger instance
func NewAuditLogger(db *gorm.DB, logger *zap.Logger) *AuditLogger {
	return &AuditLogger{
		db:     db,
		logger: logger,
	}
}

// LogSecurityEvent logs a security event to the database
func (al *AuditLogger) LogSecurityEvent(ctx context.Context, event SecurityEvent) error {
	// Set timestamp if not provided
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	// Redact PII from event data before storing
	if event.EventData != nil {
		event.EventData = logging.RedactMap(event.EventData)
	}

	// Redact PII from user agent
	if event.UserAgent != "" {
		event.UserAgent = logging.RedactPII(event.UserAgent)
	}

	// Convert event data to JSON string
	var eventDataStr string
	if event.EventData != nil {
		eventDataJSON, err := json.Marshal(event.EventData)
		if err != nil {
			al.logger.Error("Failed to marshal event data",
				zap.Error(err),
				zap.String("event_type", string(event.EventType)),
			)
		} else {
			eventDataStr = string(eventDataJSON)
		}
	}

	modelEvent := models.SecurityEvent{
		TenantKey: tenant.FromContext(ctx),
		EventType: string(event.EventType),
		Severity:  string(event.Severity),
		EventData: eventDataStr,
		Timestamp: event.Timestamp,
	}
	if event.TenantKey != "" {
		modelEvent.TenantKey = tenant.NormalizeTenantKey(event.TenantKey)
	}

	if event.UserID != "" {
		modelEvent.UserID = &event.UserID
	}
	if event.CorrelationID != "" {
		modelEvent.CorrelationID = &event.CorrelationID
	}
	if event.IPAddress != "" {
		modelEvent.IPAddress = &event.IPAddress
	}
	if event.UserAgent != "" {
		modelEvent.UserAgent = &event.UserAgent
	}

	// Store in database
	db := dbctx.GetDB(ctx, al.db)
	if err := db.WithContext(ctx).Create(&modelEvent).Error; err != nil {
		al.logger.Error("Failed to store security event",
			zap.Error(err),
			zap.String("event_type", string(event.EventType)),
			zap.String("correlation_id", event.CorrelationID),
		)
		return err
	}

	// Also log to application logs for immediate visibility
	al.logger.Info("Security event logged",
		zap.String("event_type", string(event.EventType)),
		zap.String("severity", string(event.Severity)),
		zap.String("user_id", event.UserID),
		zap.String("correlation_id", event.CorrelationID),
	)

	return nil
}

// LogAdminAction logs an administrative action
func (al *AuditLogger) LogAdminAction(ctx context.Context, action AdminAction) error {
	if action.Timestamp.IsZero() {
		action.Timestamp = time.Now()
	}

	if action.PreviousData != nil {
		action.PreviousData = logging.RedactMap(action.PreviousData)
	}
	if action.NewData != nil {
		action.NewData = logging.RedactMap(action.NewData)
	}

	eventData := map[string]interface{}{
		"admin_id":      action.AdminID,
		"action_type":   action.ActionType,
		"target_user":   action.TargetUser,
		"previous_data": action.PreviousData,
		"new_data":      action.NewData,
		"reason":        action.Reason,
	}

	event := SecurityEvent{
		EventType: EventType("admin_action_" + action.ActionType),
		Severity:  SeverityWarning, // Admin actions are always at least warnings
		UserID:    action.AdminID,
		EventData: eventData,
		Timestamp: action.Timestamp,
	}

	return al.LogSecurityEvent(ctx, event)
}

// LogAuthenticationSuccess logs a successful authentication
func (al *AuditLogger) LogAuthenticationSuccess(ctx context.Context, userID, correlationID, ipAddress, userAgent string) error {
	return al.LogSecurityEvent(ctx, SecurityEvent{
		EventType:     EventAuthenticationSuccess,
		Severity:      SeverityInfo,
		UserID:        userID,
		CorrelationID: correlationID,
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
	})
}

// LogAuthenticationFailure logs a failed authentication attempt
func (al *AuditLogger) LogAuthenticationFailure(ctx context.Context, reason, correlationID, ipAddress, userAgent string) error {
	return al.LogSecurityEvent(ctx, SecurityEvent{
		EventType:     EventAuthenticationFailed,
		Severity:      SeverityWarning,
		CorrelationID: correlationID,
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		EventData: map[string]interface{}{
			"reason": reason,
		},
	})
}

// LogAuthorizationDenied logs an authorization denial
func (al *AuditLogger) LogAuthorizationDenied(ctx context.Context, userID, resource, action, correlationID string) error {
	return al.LogSecurityEvent(ctx, SecurityEvent{
		EventType:     EventAuthorizationDenied,
		Severity:      SeverityWarning,
		UserID:        userID,
		CorrelationID: correlationID,
		EventData: map[string]interface{}{
			"resource": resource,
			"action":   action,
		},
	})
}

// LogRateLimitExceeded logs a rate limit violation
func (al *AuditLogger) LogRateLimitExceeded(ctx context.Context, userID, endpoint, correlationID, ipAddress string, limit int64) error {
	return al.LogSecurityEvent(ctx, SecurityEvent{
		EventType:     EventRateLimitExceeded,
		Severity:      SeverityWarning,
		UserID:        userID,
		CorrelationID: correlationID,
		IPAddress:     ipAddress,
		EventData: map[string]interface{}{
			"endpoint": endpoint,
			"limit":    limit,
		},
	})
}
