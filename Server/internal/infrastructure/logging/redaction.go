// Package logging provides PII redaction utilities for secure logging
package logging

import (
	"regexp"
	"strings"
)

// Compiled regex patterns for PII detection
var (
	// Email addresses
	emailRegex = regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)

	// Bearer tokens (JWT and other auth tokens)
	bearerTokenRegex = regexp.MustCompile(`Bearer\s+[A-Za-z0-9\-._~+/]+=*`)

	// API keys (common patterns)
	apiKeyRegex = regexp.MustCompile(`(?i)(api[_-]?key|apikey|access[_-]?token|secret[_-]?key)["\s:=]+([A-Za-z0-9\-._~+/]{20,})`)

	// Credit card numbers (basic pattern)
	creditCardRegex = regexp.MustCompile(`\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b`)

	// Phone numbers (US format)
	phoneRegex = regexp.MustCompile(`\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`)

	// Social Security Numbers (US format)
	ssnRegex = regexp.MustCompile(`\b\d{3}-\d{2}-\d{4}\b`)

	// Password fields in JSON/logs
	passwordFieldRegex = regexp.MustCompile(`(?i)"(password|passwd|pwd|secret)":\s*"[^"]*"`)

	// Token fields in JSON/logs
	tokenFieldRegex = regexp.MustCompile(`(?i)"(token|auth|authorization|bearer)":\s*"[^"]*"`)
)

// RedactPII removes personally identifiable information from strings
func RedactPII(message string) string {
	if message == "" {
		return message
	}

	message = emailRegex.ReplaceAllString(message, "[EMAIL_REDACTED]")
	message = bearerTokenRegex.ReplaceAllString(message, "Bearer [TOKEN_REDACTED]")
	message = apiKeyRegex.ReplaceAllString(message, "$1: [API_KEY_REDACTED]")
	message = creditCardRegex.ReplaceAllString(message, "[CC_REDACTED]")
	message = phoneRegex.ReplaceAllString(message, "[PHONE_REDACTED]")
	message = ssnRegex.ReplaceAllString(message, "[SSN_REDACTED]")
	message = passwordFieldRegex.ReplaceAllString(message, `"$1": "[REDACTED]"`)
	message = tokenFieldRegex.ReplaceAllString(message, `"$1": "[REDACTED]"`)

	return message
}

// RedactMap redacts PII from map values (useful for structured logging)
func RedactMap(data map[string]interface{}) map[string]interface{} {
	if data == nil {
		return data
	}

	redacted := make(map[string]interface{}, len(data))

	for key, value := range data {
		lowerKey := strings.ToLower(key)
		if isSensitiveField(lowerKey) {
			redacted[key] = "[REDACTED]"
			continue
		}

		if str, ok := value.(string); ok {
			redacted[key] = RedactPII(str)
		} else if nestedMap, ok := value.(map[string]interface{}); ok {
			redacted[key] = RedactMap(nestedMap)
		} else {
			redacted[key] = value
		}
	}

	return redacted
}

func isSensitiveField(fieldName string) bool {
	sensitiveFields := []string{
		"password", "passwd", "pwd",
		"secret", "api_key", "apikey",
		"token", "auth", "authorization",
		"credit_card", "creditcard", "cc",
		"ssn", "social_security",
		"phone", "telephone",
		"email", 
	}

	for _, sensitive := range sensitiveFields {
		if strings.Contains(fieldName, sensitive) {
			return true
		}
	}
	return false
}
