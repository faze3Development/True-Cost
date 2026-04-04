package jobs

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/Server/internal/models"
	"github.com/faze3Development/true-cost/Server/internal/retrieval/canonical"
	"github.com/faze3Development/true-cost/Server/internal/scraper"
)

// Consumer processes scrape tasks dequeued from Redis via Asynq.
type Consumer struct {
	server          *asynq.Server
	mux             *asynq.ServeMux
	db              *gorm.DB
	scraperTimeout  time.Duration
	scraperSleep    time.Duration
	confidenceScore int
	dataSource      string
}

// NewConsumer creates and configures the Asynq server and ServeMux, then
// registers the scrape task handler.
func NewConsumer(redisOpt asynq.RedisClientOpt, db *gorm.DB, concurrency int, shutdownTimeout time.Duration, scraperTimeout time.Duration, scraperSleep time.Duration, confidenceScore int, dataSource string) *Consumer {
	srv := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: concurrency,
		Queues: map[string]int{
			ScrapeQueue: 10,
		},
		// Graceful shutdown: wait for in-flight tasks before exiting.
		ShutdownTimeout: shutdownTimeout,
		ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
			zap.L().Error("consumer: task failed",
				zap.String("task_type", task.Type()),
				zap.Error(err),
			)
		}),
		Logger: &asynqLogger{},
	})

	mux := asynq.NewServeMux()
	c := &Consumer{
		server:          srv,
		mux:             mux,
		db:              db,
		scraperTimeout:  scraperTimeout,
		scraperSleep:    scraperSleep,
		confidenceScore: confidenceScore,
		dataSource:      dataSource,
	}
	mux.HandleFunc(TypeScrapeProperty, c.HandleScrapeProperty)

	return c
}

// Run starts the Asynq worker. It blocks until the server shuts down.
// Graceful shutdown is handled by asynq.Server.Shutdown which is triggered
// when the process receives SIGTERM or SIGINT.
func (c *Consumer) Run() error {
	return c.server.Run(c.mux)
}

// Shutdown initiates a graceful shutdown of the Asynq server, waiting up to
// ShutdownTimeout for in-flight tasks to complete before returning.
func (c *Consumer) Shutdown() {
	c.server.Shutdown()
}

// HandleScrapeProperty is the Asynq task handler for TypeScrapeProperty.
// It calls the chromedp scraper and persists the resulting PriceRecords.
func (c *Consumer) HandleScrapeProperty(ctx context.Context, task *asynq.Task) error {
	var payload ScrapePropertyPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("unmarshal payload: %w", err)
	}

	zap.L().Info("consumer: starting scrape",
		zap.String("property_id", payload.PropertyID),
		zap.String("url", payload.URL),
	)

	result, err := scraper.ExtractPricingDetailed(payload.URL, c.scraperTimeout, c.scraperSleep, c.confidenceScore)
	if err != nil {
		return fmt.Errorf("extract pricing for property %s: %w", payload.PropertyID, err)
	}

	units := result.Units
	imageURL := result.ImageURL

	if err := c.persistScrapePayload(payload.PropertyID, payload.URL, result.Metadata); err != nil {
		zap.L().Warn("consumer: persist scrape payload failed",
			zap.String("property_id", payload.PropertyID),
			zap.Error(err),
		)
	}

	if err := c.normalizeRawPayload(payload.PropertyID, result.Metadata); err != nil {
		zap.L().Warn("consumer: canonical normalization failed",
			zap.String("property_id", payload.PropertyID),
			zap.Error(err),
		)
	}

	if imageURL != "" {
		if err := c.db.Model(&models.Property{}).
			Where("id = ?", payload.PropertyID).
			Update("image_url", imageURL).Error; err != nil {
			zap.L().Warn("consumer: update property image_url failed",
				zap.String("property_id", payload.PropertyID),
				zap.Error(err),
			)
		}
	}

	now := time.Now().UTC()

	for _, u := range units {
		// Upsert Unit record.
		var unit models.Unit
		res := c.db.Where(models.Unit{
			PropertyID: payload.PropertyID,
			UnitNumber: u.UnitNumber,
		}).FirstOrCreate(&unit, models.Unit{
			PropertyID:    payload.PropertyID,
			UnitNumber:    u.UnitNumber,
			FloorplanName: u.FloorplanName,
			Bedrooms:      u.Bedrooms,
			Bathrooms:     u.Bathrooms,
			SquareFeet:    u.SquareFeet,
		})
		if res.Error != nil {
			zap.L().Error("consumer: upsert unit failed",
				zap.String("unit_number", u.UnitNumber),
				zap.Error(res.Error),
			)
			continue
		}

		record := models.PriceRecord{
			UnitID:          unit.ID,
			DateScraped:     now,
			AdvertisedRent:  u.AdvertisedRent,
			ConcessionText:  u.ConcessionText,
			EffectiveRent:   u.EffectiveRent,
			IsAvailable:     u.IsAvailable,
			Source:          c.dataSource,
			ConfidenceScore: c.confidenceScore,
		}

		if err := c.db.Create(&record).Error; err != nil {
			zap.L().Error("consumer: create price record failed",
				zap.String("unit_id", unit.ID),
				zap.Error(err),
			)
		}
	}

	zap.L().Info("consumer: scrape complete",
		zap.String("property_id", payload.PropertyID),
		zap.Int("units_processed", len(units)),
	)

	return nil
}

func (c *Consumer) persistScrapePayload(propertyID string, sourceURL string, meta scraper.ExtractionMetadata) error {
	if strings.TrimSpace(meta.RawUnitsJSON) == "" && strings.TrimSpace(meta.RawListingJSON) == "" {
		return nil
	}

	capturedAt := meta.ScrapedAt
	if capturedAt.IsZero() {
		capturedAt = time.Now().UTC()
	}

	payload := models.ScrapePayload{
		PropertyID:          propertyID,
		SourceURL:           sourceURL,
		ExtractionVersion:   meta.ExtractionVersion,
		PageTitle:           meta.PageTitle,
		RawUnitsJSON:        meta.RawUnitsJSON,
		RawListingJSON:      meta.RawListingJSON,
		RawListingURL:       meta.RawListingURL,
		RawNetworkJSONCount: meta.RawNetworkJSONCount,
		RawCardCount:        meta.RawCardCount,
		ParsedUnitCount:     meta.ParsedUnitCount,
		RawImageURL:         meta.RawImageURL,
		NormalizedImageURL:  meta.NormalizedImageURL,
		CapturedAt:          capturedAt,
	}

	return c.db.Create(&payload).Error
}

func (c *Consumer) normalizeRawPayload(propertyID string, meta scraper.ExtractionMetadata) error {
	rawPayload := strings.TrimSpace(meta.RawListingJSON)
	if rawPayload == "" {
		return nil
	}

	sourceName := sourceNameFromURL(meta.TargetURL)
	raw := canonical.RawEnvelope{
		SourceName:       sourceName,
		SourceListingKey: listingKeyFromURL(meta.RawListingURL),
		CapturedAt:       normalizeMetaTime(meta.ScrapedAt),
		PayloadHash:      hashPayload(rawPayload),
		Payload:          json.RawMessage(rawPayload),
		Metadata: map[string]string{
			"propertyId":    propertyID,
			"rawPayloadRef": fmt.Sprintf("db://scrape_payloads/%s", propertyID),
			"targetURL":     meta.TargetURL,
			"listingURL":    meta.RawListingURL,
		},
	}

	normalizer := canonical.NewGenericNormalizer()
	doc, validation, err := normalizer.Normalize(context.Background(), raw)
	if err != nil {
		return err
	}

	errorCount, warningCount := countValidationIssues(validation)
	logger := zap.L().Info
	if validation.Status == canonical.ValidationFail {
		logger = zap.L().Warn
	}

	logger("consumer: canonical normalization completed",
		zap.String("property_id", propertyID),
		zap.String("document_id", doc.DocumentID),
		zap.String("validation_status", string(validation.Status)),
		zap.Int("errors", errorCount),
		zap.Int("warnings", warningCount),
	)

	return nil
}

func hashPayload(payload string) string {
	digest := sha256.Sum256([]byte(payload))
	return "sha256:" + hex.EncodeToString(digest[:])
}

func normalizeMetaTime(t time.Time) time.Time {
	if t.IsZero() {
		return time.Now().UTC()
	}
	return t.UTC()
}

func sourceNameFromURL(raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u.Host == "" {
		return "unknown_source"
	}
	host := strings.ToLower(strings.TrimPrefix(u.Hostname(), "www."))
	host = strings.ReplaceAll(host, ".", "_")
	if host == "" {
		return "unknown_source"
	}
	return host
}

func listingKeyFromURL(raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return ""
	}
	segments := strings.Split(strings.Trim(strings.TrimSpace(u.Path), "/"), "/")
	if len(segments) == 0 {
		return ""
	}
	return segments[len(segments)-1]
}

func countValidationIssues(result canonical.ValidationResult) (int, int) {
	errors := 0
	warnings := 0
	for _, issue := range result.Issues {
		switch issue.Severity {
		case canonical.IssueError:
			errors++
		case canonical.IssueWarning:
			warnings++
		}
	}
	return errors, warnings
}

// ---------------------------------------------------------------------------
// asynqLogger adapts zap to the asynq.Logger interface.
// ---------------------------------------------------------------------------

type asynqLogger struct{}

func (l *asynqLogger) Debug(args ...interface{}) {
	zap.L().Debug(fmt.Sprint(args...))
}
func (l *asynqLogger) Info(args ...interface{}) {
	zap.L().Info(fmt.Sprint(args...))
}
func (l *asynqLogger) Warn(args ...interface{}) {
	zap.L().Warn(fmt.Sprint(args...))
}
func (l *asynqLogger) Error(args ...interface{}) {
	zap.L().Error(fmt.Sprint(args...))
}
func (l *asynqLogger) Fatal(args ...interface{}) {
	zap.L().Error("FATAL: " + fmt.Sprint(args...))
}
