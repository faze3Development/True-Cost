package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/hibiken/asynq"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/internal/models"
	"github.com/faze3Development/true-cost/internal/scraper"
)

// Consumer processes scrape tasks dequeued from Redis via Asynq.
type Consumer struct {
	server *asynq.Server
	mux    *asynq.ServeMux
	db     *gorm.DB
}

// NewConsumer creates and configures the Asynq server and ServeMux, then
// registers the scrape task handler.
func NewConsumer(redisOpt asynq.RedisClientOpt, db *gorm.DB, concurrency int) *Consumer {
	srv := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: concurrency,
		Queues: map[string]int{
			ScrapeQueue: 10,
		},
		// Graceful shutdown: wait up to 30 seconds for in-flight tasks.
		ShutdownTimeout: 30 * time.Second,
		ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
			slog.Error("consumer: task failed",
				slog.String("task_type", task.Type()),
				slog.String("error", err.Error()),
			)
		}),
		Logger: &asynqLogger{},
	})

	mux := asynq.NewServeMux()
	c := &Consumer{server: srv, mux: mux, db: db}
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

	slog.Info("consumer: starting scrape",
		slog.Uint64("property_id", uint64(payload.PropertyID)),
		slog.String("url", payload.URL),
	)

	units, err := scraper.ExtractPricing(payload.URL)
	if err != nil {
		return fmt.Errorf("extract pricing for property %d: %w", payload.PropertyID, err)
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
			slog.Error("consumer: upsert unit failed",
				slog.String("unit_number", u.UnitNumber),
				slog.String("error", res.Error.Error()),
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
			Source:          "DirectSite",
			ConfidenceScore: u.ConfidenceScore,
		}

		if err := c.db.Create(&record).Error; err != nil {
			slog.Error("consumer: create price record failed",
				slog.Uint64("unit_id", uint64(unit.ID)),
				slog.String("error", err.Error()),
			)
		}
	}

	slog.Info("consumer: scrape complete",
		slog.Uint64("property_id", uint64(payload.PropertyID)),
		slog.Int("units_processed", len(units)),
	)

	return nil
}

// ---------------------------------------------------------------------------
// asynqLogger adapts Go's slog to the asynq.Logger interface.
// ---------------------------------------------------------------------------

type asynqLogger struct{}

func (l *asynqLogger) Debug(args ...interface{}) {
	slog.Debug(fmt.Sprint(args...))
}
func (l *asynqLogger) Info(args ...interface{}) {
	slog.Info(fmt.Sprint(args...))
}
func (l *asynqLogger) Warn(args ...interface{}) {
	slog.Warn(fmt.Sprint(args...))
}
func (l *asynqLogger) Error(args ...interface{}) {
	slog.Error(fmt.Sprint(args...))
}
func (l *asynqLogger) Fatal(args ...interface{}) {
	slog.Error("FATAL: " + fmt.Sprint(args...))
}
