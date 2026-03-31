# True-Cost

A scalable Go backend that tracks historical apartment pricing, hidden fees, and concessions via daily web scraping to expose the **real cost of renting**. Instead of showing only the advertised rent, True-Cost calculates what a tenant will actually pay each month by factoring in recurring fees (trash, amenities, parking, packages) and any applied concessions.

## Table of Contents

- [Architecture](#architecture)
- [Data Flow](#data-flow)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Configuration](#configuration)
- [Local Development](#local-development)
- [Docker & Deployment](#docker--deployment)
- [Technology Stack](#technology-stack)

---

## Architecture

The project is split into two independently deployable services, both compiled from this single repository:

```
True-Cost/
├── cmd/
│   ├── api/        # REST API service  (port 8080)
│   └── worker/     # Scraper + job worker service  (port 8081)
├── internal/
│   ├── api/        # Gin router & HTTP handlers
│   ├── config/     # Environment-based configuration
│   ├── db/         # PostgreSQL connection & auto-migration
│   ├── jobs/       # Asynq task definitions, producer, consumer
│   ├── models/     # GORM data models
│   └── scraper/    # Headless-Chrome scraper (chromedp)
├── Dockerfile      # Multi-stage build for both services
├── go.mod
└── go.sum
```

| Service | Image base | Responsibility |
|---------|-----------|----------------|
| **API** | `distroless/static-debian12` | Serves the REST API; stateless, scales to zero |
| **Worker** | `chromedp/headless-shell` | Runs headless Chrome, processes scrape jobs from Redis |

Both services share the same PostgreSQL database. The Worker also requires a Redis instance for the Asynq job queue.

---

## Data Flow

```
1. Cloud Scheduler fires a daily cron
        ↓
2. POST /enqueue  →  Producer HTTP handler
        ↓
3. Producer fetches all Properties from the DB,
   adds random jitter (0–60 min) per property,
   and enqueues a scrape task to Redis for each one
        ↓
4. Consumer (5 concurrent workers) dequeues tasks
        ↓
5. Per task:
   - Scraper launches headless Chrome → extracts unit/pricing data
   - Units are upserted; a new PriceRecord is written for today
        ↓
6. REST API clients query:
   - Properties  (filter by city / state)
   - Units        (filter by bedrooms)
   - Price history with computed true_cost
```

---

## API Endpoints

Base path: `/api/v1`

### Properties

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| `GET` | `/properties` | `city`, `state` | List all properties; optionally filter by city and/or state (case-insensitive) |
| `GET` | `/properties/:id` | — | Get a single property, including its `FeeStructure` |
| `GET` | `/properties/:id/units` | `beds` | List units for a property; `beds` supports fractional values (e.g. `0.5` for studios) |

### Units

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| `GET` | `/units/:id/history` | `days` (default `30`) | Time-series price history for a unit with a computed `true_cost` field |

#### `true_cost` formula

```
true_cost = effective_rent + trash_fee + amenity_fee + package_fee
```

`effective_rent` is the advertised rent after any concession is applied. `true_cost` is computed at query time and is not stored in the database.

---

## Data Models

### `Property`
Represents a rental community or building.

| Field | Type | Notes |
|-------|------|-------|
| `ID` | uint | Primary key |
| `Name` | string | |
| `Address` | string | |
| `City` | string | Indexed |
| `State` | string | Indexed |
| `ZipCode` | string | |
| `WebsiteURL` | string | Scraper target URL |

Has many `Unit`s and one `FeeStructure`.

### `FeeStructure`
Recurring monthly fees charged by a property.

| Field | Type |
|-------|------|
| `PropertyID` | uint (unique FK) |
| `TrashFee` | float64 |
| `AmenityFee` | float64 |
| `PackageFee` | float64 |
| `ParkingFee` | float64 |

### `Unit`
An individual unit or floorplan within a property.

| Field | Type |
|-------|------|
| `PropertyID` | uint (indexed FK) |
| `UnitNumber` | string |
| `FloorplanName` | string |
| `Bedrooms` | float64 |
| `Bathrooms` | float64 |
| `SquareFeet` | int |

Has many `PriceRecord`s.

### `PriceRecord`
A single scraped data point captured on a specific day.

| Field | Type | Notes |
|-------|------|-------|
| `UnitID` | uint | Indexed |
| `DateScraped` | time.Time | Indexed |
| `AdvertisedRent` | float64 | |
| `EffectiveRent` | float64 | After concessions |
| `ConcessionText` | string | Raw concession text from site |
| `IsAvailable` | bool | |
| `Source` | string | e.g. `"DirectSite"` |
| `ConfidenceScore` | int | Scraper confidence (0–100) |
| `TrueCost` | float64 | Computed at query time, not stored |

---

## Configuration

Configuration is loaded from environment variables. The only **required** variable is `DB_PASSWORD`; all others have defaults suitable for local development.

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | *(required)* | PostgreSQL password |
| `DB_NAME` | `truecost` | PostgreSQL database name |
| `DB_SSLMODE` | `disable` | PostgreSQL SSL mode |
| `REDIS_ADDR` | `localhost:6379` | Redis address (worker only) |
| `PORT` | `8080` | HTTP listen port |

---

## Local Development

### Prerequisites

- Go 1.24+
- PostgreSQL
- Redis
- Chrome / Chromium (for the worker)

### Run the API

```bash
export DB_PASSWORD=your_password
go run ./cmd/api
```

### Run the Worker

```bash
export DB_PASSWORD=your_password
export REDIS_ADDR=localhost:6379
go run ./cmd/worker
```

The worker exposes `POST /enqueue` on port 8081. Trigger a scrape manually with:

```bash
curl -X POST http://localhost:8081/enqueue
```

---

## Docker & Deployment

The `Dockerfile` uses a multi-stage build to produce two separate images from the same source tree.

### Build

```bash
# API image
docker build --target api -t true-cost-api .

# Worker image
docker build --target worker -t true-cost-worker .
```

### Run

```bash
# API
docker run -p 8080:8080 \
  -e DB_HOST=<host> -e DB_PASSWORD=<pass> \
  true-cost-api

# Worker
docker run -p 8081:8081 \
  -e DB_HOST=<host> -e DB_PASSWORD=<pass> \
  -e REDIS_ADDR=<redis-host>:6379 \
  true-cost-worker
```

### GCP Cloud Run

Both images are designed for GCP Cloud Run:

- The **API** image (`distroless/static-debian12`) is lightweight and stateless — ideal for scale-to-zero.
- The **Worker** image (`chromedp/headless-shell`) includes all Chrome dependencies required by chromedp and runs with `--no-sandbox` for container compatibility.
- Structured JSON logs are written to stdout for native Cloud Logging ingestion.
- A **Cloud Scheduler** job should be configured to `POST /enqueue` on the Worker service URL on your desired scrape cadence.

---

## Technology Stack

| Component | Library | Version |
|-----------|---------|---------|
| HTTP framework | [Gin](https://github.com/gin-gonic/gin) | v1.9.1 |
| ORM | [GORM](https://gorm.io) | v1.25.12 |
| PostgreSQL driver | gorm/driver/postgres (pgx v5) | v1.5.11 |
| Job queue | [Asynq](https://github.com/hibiken/asynq) | v0.24.1 |
| Queue backend | Redis (go-redis v9) | v9.0.3 |
| Web scraper | [chromedp](https://github.com/chromedp/chromedp) | v0.10.0 |
| Logging | slog (stdlib) | — |
