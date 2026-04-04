# True-Cost

A full-stack app (Next.js frontend + Go backend) that tracks historical apartment pricing, hidden fees, and concessions via daily web scraping to expose the **real cost of renting**. Instead of showing only the advertised rent, True-Cost calculates what a tenant will actually pay each month by factoring in recurring fees (trash, amenities, parking, packages) and any applied concessions.

## Table of Contents

- [Architecture](#architecture)
- [Data Flow](#data-flow)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Configuration](#configuration)
- [Local Development](#local-development)
- [Admin & Management](#admin--management)
- [Multi-tenancy & RLS](#multi-tenancy--rls)
- [Docker & Deployment](#docker--deployment)
- [Technology Stack](#technology-stack)

---

## Architecture

The project is split into a Next.js frontend and two Go services (API + worker), all in this single repository:

```
True-Cost/
├── frontend/            # Next.js 14 app (port 3000)
├── Server/              # Go services
│   ├── cmd/
│   │   └── api/         # REST API service (port 8080)
│   ├── internal/        # handlers, infra modules, config, db, jobs, etc.
│   ├── migrations/      # gormigrate migrations
│   └── main.go          # Worker entrypoint (producer + consumer; producer HTTP on 8081)
├── docker-compose.yml   # Local Postgres + Redis + API + worker
├── Dockerfile           # Multi-stage build for API + worker images
├── go.mod
└── go.sum
```

| Service | Image base | Responsibility |
|---------|-----------|----------------|
| **Frontend** | *(not in Dockerfile)* | Next.js web UI (auth, maps, admin pages) |
| **API** | `distroless/static-debian12` | Serves the REST API |
| **Worker** | `chromedp/headless-shell` | Runs headless Chrome, processes scrape jobs from Redis |

All services share the same PostgreSQL database. The Worker also requires a Redis instance for the Asynq job queue.

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

### Server (Go)

Server configuration is loaded from environment variables. The only **required** variable is `DB_PASSWORD`; all others have defaults suitable for local development.

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | *(required)* | PostgreSQL password |
| `DB_NAME` | `truecost` | PostgreSQL database name |
| `DB_SSLMODE` | `disable` | PostgreSQL SSL mode |
| `DB_RUNTIME_ROLE` | *(empty)* | Optional: `SET LOCAL ROLE` for request transactions (helps ensure RLS isn't bypassed by superuser) |
| `REDIS_ADDR` | `localhost:6379` | Redis address (worker only) |
| `PORT` | `8080` | HTTP listen port |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated allowlist for CORS |
| `ADMIN_BOOTSTRAP_SECRET` | *(empty)* | One-time secret required to call `POST /api/v1/admin/bootstrap` for first admin promotion |
| `FIREBASE_PROJECT_ID` | *(empty)* | Firebase project ID used by backend token verification |
| `FIREBASE_CREDENTIALS_FILE` | *(empty)* | Path to Firebase service-account JSON for Admin SDK |
| `FIREBASE_CREDENTIALS_JSON` | *(empty)* | Optional single-line JSON credentials instead of file path |

Server-side Firebase token verification is mandatory for protected routes. If Firebase Admin SDK cannot initialize, the API exits at startup.

In non-production environments, both Go services load local env files automatically:

- `Server/.env`
- `.env` (fallback)

### Frontend (Next.js)

Frontend configuration is via Next.js environment variables (for local dev, use `frontend/.env.local`).

- `NEXT_PUBLIC_API_URL` (default: `http://localhost:8080/api/v1`)
- `NEXT_PUBLIC_FIREBASE_*` (required for auth-protected pages)
- `NEXT_PUBLIC_STRIPE_*` (required for subscriptions/checkout)

---

## Local Development

### Prerequisites

- Go 1.25+
- Node.js 18+ (for the Next.js frontend)
- PostgreSQL + Redis (or use `docker compose`)
- Chrome / Chromium (if running the worker locally)

### Start dependencies (recommended)

```bash
docker compose up -d postgres redis
```

### Configure env

1. Copy `Server/.env.example` → `Server/.env`
2. Set at least `DB_PASSWORD` (and optionally `ADMIN_BOOTSTRAP_SECRET`)
        - If you start Postgres via `docker compose` without a root `.env`, the compose default is `DB_PASSWORD=changeme`.

### Run the API

```bash
go run ./Server/cmd/api
```

If you prefer Make, `make dev` from `Server/` now runs the API entrypoint.

### Run the Worker (optional)

```bash
go run ./Server
```

To run the worker via Make, use `make dev-worker` from `Server/`.

The worker exposes `POST /enqueue` on port 8081. Trigger a scrape manually with:

```bash
curl -X POST http://localhost:8081/enqueue
```

### Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

To bootstrap the first admin, see [Admin & Management](#admin--management).

---

## Admin & Management

### Bootstrap First Admin (One-Time)

1. Set `ADMIN_BOOTSTRAP_SECRET` in `Server/.env`.
2. Start the API service so migrations run.
3. Ensure at least one user exists in `users` (sign in once through the app).
4. Promote the first admin with:

```bash
curl -X POST http://localhost:8080/api/v1/admin/bootstrap \
        -H "Content-Type: application/json" \
        -H "X-Admin-Bootstrap-Secret: <your-secret>" \
        -d '{"email":"admin@example.com"}'
```

After the first successful bootstrap, rotate or remove `ADMIN_BOOTSTRAP_SECRET`.

Windows shortcut:

```powershell
powershell -ExecutionPolicy Bypass -File Server/scripts/bootstrap-admin.ps1 -Email "admin@example.com" -Secret "<your-secret>"
```

### Admin UI pages

- `/admin` — top navigation config editor
- `/admin/management` — operational management UI (tenants, system settings, RBAC)

---

## Multi-tenancy & RLS

The API supports multi-tenancy via an `X-Tenant-Key` header. For tenant-scoped tables, Postgres Row-Level Security (RLS) policies enforce that requests can only access rows for the active tenant.

- **Tenant selection**: `X-Tenant-Key: <tenant_key>` (defaults to `default` if omitted)
- **RLS implementation**: the API starts a request-scoped transaction and sets a transaction-local Postgres setting (`app.tenant_key`). RLS policies use `current_setting('app.tenant_key', true)`.
- **Superuser caveat**: Postgres superusers (and roles with `BYPASSRLS`) bypass RLS. The API/worker log a warning at startup if connected as a superuser.
- **`DB_RUNTIME_ROLE` (optional)**: the API can run each request transaction under an effective role via `SET LOCAL ROLE ...` (requires the configured DB user to have permission to `SET ROLE`).

---

## Docker & Deployment

The `Dockerfile` uses a multi-stage build to produce two separate images (API + worker) from the same source tree. The frontend is built/deployed separately from `frontend/`.

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
        -e FIREBASE_PROJECT_ID=<firebase-project-id> \
        -e FIREBASE_CREDENTIALS_FILE=/run/secrets/firebase-service-account.json \
        -v $(pwd)/Server/firebase-service-account.json:/run/secrets/firebase-service-account.json:ro \
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

### Docker local auth setup (real Firebase tokens)

1. Download a Firebase service-account key JSON for your project.
2. Place it at `Server/firebase-service-account.json` (gitignored).
3. Set `FIREBASE_PROJECT_ID` in `Server/.env`.
4. Start services with `docker compose up --build`.

With this setup, backend auth verifies signed Firebase ID tokens server-side on every protected request.

---

## Technology Stack

| Area | Tech |
|------|------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind |
| API | Go, Gin, GORM |
| Auth | Firebase (Admin SDK on backend; Firebase JS SDK on frontend) |
| Jobs | Asynq + Redis |
| Data | PostgreSQL + gormigrate |
| Scraper | chromedp / headless Chrome |
| Payments | Stripe |
| Logging | zap |

See `go.mod` and `frontend/package.json` for exact dependency versions.
