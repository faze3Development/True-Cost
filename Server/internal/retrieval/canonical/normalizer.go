package canonical

import (
	"context"
	"encoding/json"
	"time"
)

type RawEnvelope struct {
	SourceName       string            `json:"sourceName"`
	SourceListingKey string            `json:"sourceListingKey"`
	CapturedAt       time.Time         `json:"capturedAt"`
	PayloadHash      string            `json:"payloadHash"`
	Payload          json.RawMessage   `json:"payload"`
	Metadata         map[string]string `json:"metadata,omitempty"`
}

type Normalizer interface {
	Normalize(ctx context.Context, raw RawEnvelope) (PropertyDocument, ValidationResult, error)
}
