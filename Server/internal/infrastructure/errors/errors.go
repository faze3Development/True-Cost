package errors

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type ErrorCategory string
type ErrorSeverity string

const (
	ErrorCategoryValidation ErrorCategory = "validation"
	ErrorCategoryAuth       ErrorCategory = "authentication"
	ErrorCategoryAuthz      ErrorCategory = "authorization"
	ErrorCategoryNotFound   ErrorCategory = "not_found"
	ErrorCategoryConflict   ErrorCategory = "conflict"
	ErrorCategoryRateLimit  ErrorCategory = "rate_limit"
	ErrorCategoryInternal   ErrorCategory = "internal"

	ErrorSeverityLow      ErrorSeverity = "low"
	ErrorSeverityMedium   ErrorSeverity = "medium"
	ErrorSeverityHigh     ErrorSeverity = "high"
	ErrorSeverityCritical ErrorSeverity = "critical"
)

// APIError represents an API error
type APIError struct {
	Type      ErrorCategory `json:"type"`
	Code      string        `json:"code"`
	Message   string        `json:"message"`
	Details   any           `json:"details,omitempty"`
	RequestID string        `json:"request_id,omitempty"`
	Timestamp string        `json:"timestamp"`
	Severity  ErrorSeverity `json:"-"`
	HttpStatus int          `json:"-"`
}

func (e *APIError) Error() string {
	return fmt.Sprintf("[%s] %s: %s", e.Type, e.Code, e.Message)
}

// Error constructors
func ErrValidation(code, message string, details any) *APIError {
	return &APIError{
		HttpStatus: http.StatusBadRequest,
		Type:       ErrorCategoryValidation,
		Code:       code,
		Message:    message,
		Details:    details,
		Severity:   ErrorSeverityLow,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
	}
}

func ErrUnauthorized(code, message string) *APIError {
	return &APIError{
		HttpStatus: http.StatusUnauthorized,
		Type:       ErrorCategoryAuth,
		Code:       code,
		Message:    message,
		Severity:   ErrorSeverityMedium,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
	}
}

func ErrForbidden(code, message string) *APIError {
	return &APIError{
		HttpStatus: http.StatusForbidden,
		Type:       ErrorCategoryAuthz,
		Code:       code,
		Message:    message,
		Severity:   ErrorSeverityMedium,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
	}
}

func ErrNotFound(code, message string) *APIError {
	return &APIError{
		HttpStatus: http.StatusNotFound,
		Type:       ErrorCategoryNotFound,
		Code:       code,
		Message:    message,
		Severity:   ErrorSeverityLow,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
	}
}

func ErrTooManyRequests(code, message string) *APIError {
	return &APIError{
		HttpStatus: http.StatusTooManyRequests,
		Type:       ErrorCategoryRateLimit,
		Code:       code,
		Message:    message,
		Severity:   ErrorSeverityMedium,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
	}
}

func ErrInternal(code, message string, err error) *APIError {
	details := ""
	if err != nil {
		details = err.Error()
	}
	return &APIError{
		HttpStatus: http.StatusInternalServerError,
		Type:       ErrorCategoryInternal,
		Code:       code,
		Message:    message,
		Details:    details,
		Severity:   ErrorSeverityHigh,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
	}
}

// GlobalErrorHandler catches panics and standardizes Gin errors
func GlobalErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Read if there are any gin errors stored
		if len(c.Errors) > 0 {
			err := c.Errors.Last().Err
			if apiErr, ok := err.(*APIError); ok {
				c.JSON(apiErr.HttpStatus, apiErr)
				return
			}
			
			// Default to internal error if not defined
			apiErr := ErrInternal("internal_error", "An unexpected error occurred", err)
			c.JSON(apiErr.HttpStatus, apiErr)
		}
	}
}
