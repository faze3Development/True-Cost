package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func newProtectedTestRouter(enableMockAuth bool) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	protected := r.Group("/api/v1")
	protected.Use(EnsureAuthenticated(nil, nil, enableMockAuth))
	protected.GET("/properties/:id/units", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	protected.GET("/units/:id/history", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	return r
}

func TestProtectedEndpointsRejectMissingAuthorizationHeader(t *testing.T) {
	r := newProtectedTestRouter(false)

	tests := []string{
		"/api/v1/properties/1/units",
		"/api/v1/units/1/history",
	}

	for _, path := range tests {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()

		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 for %s, got %d", path, rec.Code)
		}
	}
}

func TestProtectedEndpointsRejectInvalidAuthorizationFormat(t *testing.T) {
	r := newProtectedTestRouter(false)

	tests := []string{
		"/api/v1/properties/1/units",
		"/api/v1/units/1/history",
	}

	for _, path := range tests {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("Authorization", "Invalid token")
		rec := httptest.NewRecorder()

		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 for %s with invalid auth format, got %d", path, rec.Code)
		}
	}
}
