# ---------------------------------------------------------------------------
# Stage 1 — Build the Go binary
# ---------------------------------------------------------------------------
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Download dependencies first for layer caching.
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build the API binary.
# Set CGO_ENABLED=0 to produce a statically linked binary that works inside
# the chromedp headless-shell image.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /api ./cmd/api && \
    go build -ldflags="-s -w" -o /worker ./cmd/worker

# ---------------------------------------------------------------------------
# Stage 2 — API service image (lightweight, no Chrome)
# ---------------------------------------------------------------------------
FROM gcr.io/distroless/static-debian12 AS api

COPY --from=builder /api /api

EXPOSE 8080

ENTRYPOINT ["/api"]

# ---------------------------------------------------------------------------
# Stage 3 — Worker + scraper image (includes headless Chrome via headless-shell)
# ---------------------------------------------------------------------------
FROM chromedp/headless-shell:latest AS worker

# Copy the worker binary into the headless-shell image.
COPY --from=builder /worker /worker

EXPOSE 8081

ENTRYPOINT ["/worker"]
