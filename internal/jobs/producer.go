package jobs

import (
	"fmt"
	"log/slog"
	"math/rand"
	"net/http"
	"time"

	"github.com/hibiken/asynq"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/internal/models"
)

const (
	// maxJitterMinutes is the upper bound for the random delay added between
	// enqueuing each property scrape task.  A jitter of up to 60 minutes avoids
	// thundering-herd scrapes that could get the server IP rate-limited.
	maxJitterMinutes = 60
)

// Producer enqueues scrape tasks for all properties stored in the database.
// It is intended to be triggered by a Cloud Scheduler HTTP request.
type Producer struct {
	client *asynq.Client
	db     *gorm.DB
}

// NewProducer returns an initialised Producer.
func NewProducer(redisOpt asynq.RedisClientOpt, db *gorm.DB) *Producer {
	return &Producer{
		client: asynq.NewClient(redisOpt),
		db:     db,
	}
}

// EnqueueHandler is an http.HandlerFunc that Cloud Scheduler calls on its cron
// schedule.  It fetches every property from the database, applies a random jitter
// between 0-60 minutes, and enqueues a scrape task for each one.
func (p *Producer) EnqueueHandler(w http.ResponseWriter, r *http.Request) {
	var properties []models.Property
	if err := p.db.Find(&properties).Error; err != nil {
		slog.Error("producer: failed to fetch properties", slog.String("error", err.Error()))
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	enqueued := 0
	for _, prop := range properties {
		jitter := time.Duration(rand.Intn(maxJitterMinutes*60)) * time.Second //nolint:gosec // non-crypto jitter
		task, err := NewScrapePropertyTask(prop.ID, prop.WebsiteURL, jitter)
		if err != nil {
			slog.Error("producer: failed to create task",
				slog.Uint64("property_id", uint64(prop.ID)),
				slog.String("error", err.Error()),
			)
			continue
		}

		info, err := p.client.Enqueue(task)
		if err != nil {
			slog.Error("producer: failed to enqueue task",
				slog.Uint64("property_id", uint64(prop.ID)),
				slog.String("error", err.Error()),
			)
			continue
		}

		slog.Info("producer: task enqueued",
			slog.Uint64("property_id", uint64(prop.ID)),
			slog.String("task_id", info.ID),
			slog.Duration("jitter", jitter),
		)
		enqueued++
	}

	slog.Info("producer: enqueue run complete",
		slog.Int("total", len(properties)),
		slog.Int("enqueued", enqueued),
	)
	fmt.Fprintf(w, `{"enqueued":%d,"total":%d}`, enqueued, len(properties))
}

// Close releases the underlying Asynq client connection.
func (p *Producer) Close() error {
	return p.client.Close()
}
