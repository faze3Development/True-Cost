package jobs

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/Server/internal/models"
)

// Producer enqueues scrape tasks for all properties stored in the database.
// It is intended to be triggered by a Cloud Scheduler HTTP request.
type Producer struct {
	client           *asynq.Client
	db               *gorm.DB
	maxJitterDuration time.Duration
	maxRetries       int
	taskTimeout      time.Duration
}

// NewProducer returns an initialised Producer.
func NewProducer(redisOpt asynq.RedisClientOpt, db *gorm.DB, maxJitterDuration time.Duration, maxRetries int, taskTimeout time.Duration) *Producer {
	return &Producer{
		client:            asynq.NewClient(redisOpt),
		db:                db,
		maxJitterDuration: maxJitterDuration,
		maxRetries:        maxRetries,
		taskTimeout:       taskTimeout,
	}
}

// EnqueueHandler is an http.HandlerFunc that Cloud Scheduler calls on its cron
// schedule.  It fetches every property from the database, applies a random jitter
// between 0-60 minutes, and enqueues a scrape task for each one.
func (p *Producer) EnqueueHandler(w http.ResponseWriter, r *http.Request) {
	var properties []models.Property
	if err := p.db.Find(&properties).Error; err != nil {
		zap.L().Error("producer: failed to fetch properties", zap.Error(err))
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	enqueued := 0
	for _, prop := range properties {
		maxJitterSeconds := int((p.maxJitterDuration.Minutes()) * 60)
		jitter := time.Duration(rand.Intn(maxJitterSeconds)) * time.Second //nolint:gosec // non-crypto jitter
		task, err := NewScrapePropertyTask(prop.ID, prop.WebsiteURL, jitter, p.maxRetries, p.taskTimeout)
		if err != nil {
			zap.L().Error("producer: failed to create task",
				zap.Uint64("property_id", uint64(prop.ID)),
				zap.Error(err),
			)
			continue
		}

		info, err := p.client.Enqueue(task)
		if err != nil {
			zap.L().Error("producer: failed to enqueue task",
				zap.Uint64("property_id", uint64(prop.ID)),
				zap.Error(err),
			)
			continue
		}

		zap.L().Info("producer: task enqueued",
			zap.Uint64("property_id", uint64(prop.ID)),
			zap.String("task_id", info.ID),
			zap.Duration("jitter", jitter),
		)
		enqueued++
	}

	zap.L().Info("producer: enqueue run complete",
		zap.Int("total", len(properties)),
		zap.Int("enqueued", enqueued),
	)
	fmt.Fprintf(w, `{"enqueued":%d,"total":%d}`, enqueued, len(properties))
}

// Close releases the underlying Asynq client connection.
func (p *Producer) Close() error {
	return p.client.Close()
}
