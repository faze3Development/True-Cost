package auth

import (
	"context"
	"net/http"
	"strings"

	firebaseAuth "firebase.google.com/go/v4/auth"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"github.com/faze3Development/true-cost/Server/internal/models"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// UserIDKey is the generic gin context key
const UserIDKey = "userID"

// TokenKey is the raw firebase token containing arbitrary claims
const TokenKey = "firebaseToken"

// AuditLogger defines the interface for logging access denial attempts.
type AuditLogger interface {
	LogUnauthorizedAccess(c *gin.Context, resource string) error
}

// UserSyncer defines an interface to sync users from Firebase into the database.
type UserSyncer interface {
	GetOrCreateUser(ctx context.Context, uid, email, displayName string) (*models.User, error)
}

// EnsureAuthenticated validates Bearer tokens using Firebase Auth and syncs the user details.
// Failures are logged to the audit log for security monitoring.
func EnsureAuthenticated(client *Client, syncer UserSyncer, enableMockAuth bool, auditLogger AuditLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			if auditLogger != nil {
				_ = auditLogger.LogUnauthorizedAccess(c, c.Request.URL.Path)
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, errors.ErrUnauthorized("auth/missing_header", "Authorization header required"))
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			if auditLogger != nil {
				_ = auditLogger.LogUnauthorizedAccess(c, c.Request.URL.Path)
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, errors.ErrUnauthorized("auth/invalid_format", "Invalid authorization header format"))
			return
		}

		tokenString := parts[1]
		if tokenString == "" {
			if auditLogger != nil {
				_ = auditLogger.LogUnauthorizedAccess(c, c.Request.URL.Path)
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, errors.ErrUnauthorized("auth/empty_token", "Token payload missing"))
			return
		}

		// Skip verification logic entirely if client isn't configured (fail secure)
		if client == nil {
			zap.L().Error("Firebase AuthClient is nil. Authentication cannot proceed.")
			c.AbortWithStatusJSON(http.StatusInternalServerError, errors.ErrInternal("auth/misconfiguration", "Authentication service is unavailable", nil))
			return
		}

		token, err := client.VerifyIDToken(c.Request.Context(), tokenString)
		if err != nil {
			if auditLogger != nil {
				_ = auditLogger.LogUnauthorizedAccess(c, c.Request.URL.Path)
			}

			if firebaseAuth.IsIDTokenRevoked(err) {
				zap.L().Warn("Revoked token attempted access", zap.Error(err))
				c.AbortWithStatusJSON(http.StatusUnauthorized, errors.ErrUnauthorized("auth/token_revoked", "The provided token has been revoked"))
				return
			}

			zap.L().Error("Token verification failed", zap.Error(err))
			c.AbortWithStatusJSON(http.StatusUnauthorized, errors.ErrUnauthorized("auth/invalid_token", "The provided token is invalid or expired"))
			return
		}

		// Sync User to Postgres gracefully
		if syncer != nil {
			email := ""
			if val, ok := token.Claims["email"].(string); ok {
				email = val
			}

			name := ""
			if val, ok := token.Claims["name"].(string); ok {
				name = val
			}

			// JIT user provision. The user repo takes care of idempotency (doesn't insert if matching UID exists)
			_, err := syncer.GetOrCreateUser(c.Request.Context(), token.UID, email, name)
			if err != nil {
				zap.L().Error("Failed to sync JIT user upon authentication", zap.Error(err), zap.String("uid", token.UID))
				c.AbortWithStatusJSON(http.StatusInternalServerError, errors.ErrInternal("auth/sync_failed", "Failed to properly provision your profile", nil))
				return
			}
		}

		// Set the UID and the raw token for potential claim extractions down the line
		c.Set(UserIDKey, token.UID)
		c.Set(TokenKey, token)

		c.Next()
	}
}

// OptionalAuth attempts to authenticate without rejecting missing headers
func OptionalAuth(client *Client, syncer UserSyncer, enableMockAuth bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString := parts[1]

				if client != nil {
					token, err := client.VerifyIDToken(c.Request.Context(), tokenString)
					if err == nil {
						// Success
						if syncer != nil {
							email := ""
							if val, ok := token.Claims["email"].(string); ok {
								email = val
							}
							name := ""
							if val, ok := token.Claims["name"].(string); ok {
								name = val
							}
							// Synchronize user context
							_, _ = syncer.GetOrCreateUser(c.Request.Context(), token.UID, email, name)
						}

						c.Set(UserIDKey, token.UID)
						c.Set(TokenKey, token)
					} else {
						zap.L().Warn("Optional auth token rejected", zap.Error(err))
					}
				}
			}
		}
		c.Next()
	}
}
