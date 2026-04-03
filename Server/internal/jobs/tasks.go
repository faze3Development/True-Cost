// Package jobs defines Asynq task types and shared constants used by both the
// producer (enqueuer) and the consumer (worker).
package jobs

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
)

const (
	// TypeScrapeProperty is the Asynq task type identifier for property scrapes.
	TypeScrapeProperty = "scrape:property"

	// ScrapeQueue is the name of the Asynq queue for scrape tasks.
	ScrapeQueue = "scrape"
)

// ScrapePropertyPayload carries the data needed to scrape a single property.
type ScrapePropertyPayload struct {
	PropertyID string `json:"property_id"`
	URL        string `json:"url"`
}

// NewScrapePropertyTask creates a new Asynq task for scraping a property.
// Tasks are configured with the specified number of retries and timeout.
func NewScrapePropertyTask(propertyID string, url string, delay time.Duration, maxRetries int, taskTimeout time.Duration) (*asynq.Task, error) {
	payload, err := json.Marshal(ScrapePropertyPayload{
		PropertyID: propertyID,
		URL:        url,
	})
	if err != nil {
		return nil, fmt.Errorf("marshal scrape payload: %w", err)
	}

	return asynq.NewTask(
		TypeScrapeProperty,
		payload,
		asynq.MaxRetry(maxRetries),
		asynq.Timeout(taskTimeout),
		asynq.Queue(ScrapeQueue),
		asynq.ProcessIn(delay),
	), nil
}
