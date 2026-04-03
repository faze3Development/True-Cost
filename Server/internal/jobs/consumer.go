package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/Server/internal/models"
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

	units, imageURL, err := scraper.ExtractPricing(payload.URL, c.scraperTimeout, c.scraperSleep, c.confidenceScore)
	if err != nil {
		return fmt.Errorf("extract pricing for property %s: %w", payload.PropertyID, err)
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
