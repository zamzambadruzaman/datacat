# datacat

A lightweight, self-hosted data catalog built on **Data Mesh** principles.

Discover, register, and govern data assets across domains — powered by
**FastAPI**, **DuckDB**, and **React**.

---

## Project Structure

```
datacat/
├── backend/                   # Python API server
│   ├── app/
│   │   ├── main.py            # FastAPI application & middleware
│   │   ├── config.py          # Environment-based settings (pydantic-settings)
│   │   ├── database.py        # DuckDB connection & schema init
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── auth.py            # API-Key authentication
│   │   └── routers/
│   │       ├── health.py      # GET /api/health
│   │       ├── domains.py     # Domain CRUD
│   │       └── assets.py      # Asset CRUD + search
│   ├── tests/
│   │   ├── conftest.py        # Test fixtures & DB reset
│   │   └── test_api.py        # API integration tests
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                  # React UI
│   ├── src/
│   │   ├── main.tsx           # Entry point
│   │   ├── App.tsx            # Routes
│   │   ├── api.ts             # Typed API client
│   │   ├── components/        # Layout, AssetList, AssetDetail, AssetForm, etc.
│   │   └── pages/             # HomePage, AssetsPage, DomainsPage
│   ├── vite.config.ts         # Dev server + API proxy
│   ├── tailwind.config.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── design.md                  # Full design document
└── README.md
```

---

## Quick Start (Docker)

```bash
cd datacat
cp .env.example .env           # set a real API_KEY
docker compose up --build
```

| Service  | URL                            |
|----------|--------------------------------|
| UI       | http://localhost:5173           |
| API docs | http://localhost:8000/docs      |
| Health   | http://localhost:8000/api/health|

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Start the API (DuckDB file stored locally)
DB_PATH=./catalog.duckdb API_KEY=dev-key uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> **Note:** In local mode (no Docker), update `vite.config.ts` proxy target
> from `http://backend:8000` to `http://localhost:8000`.

### Tests

```bash
cd backend
pytest -v
```

Tests use an in-memory DuckDB instance and reset state between each test
for full isolation.

---

## Tech Stack

| Layer          | Technology                  | Purpose                              |
|----------------|-----------------------------|--------------------------------------|
| Backend API    | FastAPI (Python 3.12)       | Async REST API, auto OpenAPI docs    |
| Metadata store | DuckDB (single file)        | Zero-config embedded OLAP database   |
| Auth           | API-Key (`X-API-KEY` header) | Simple auth, swappable for OAuth2   |
| Frontend       | React 18 + Vite + Tailwind  | Fast dev builds, utility-first CSS   |
| Containers     | Docker Compose              | One-command local environment        |

---

## API Reference

All **mutating** endpoints (POST, PUT, DELETE) require the `X-API-KEY` header.
Read endpoints are open by default (set `AUTH_READ_ENDPOINTS=true` to protect them).

### Health

| Method | Path          | Description    |
|--------|---------------|----------------|
| GET    | `/api/health` | Liveness probe |

### Domains

| Method | Path                | Description           |
|--------|---------------------|-----------------------|
| GET    | `/api/domains`      | List all domains      |
| POST   | `/api/domains`      | Create a domain       |
| GET    | `/api/domains/{id}` | Get domain by ID      |
| PUT    | `/api/domains/{id}` | Update a domain       |
| DELETE | `/api/domains/{id}` | Delete domain + assets|

### Assets

| Method | Path               | Description                                            |
|--------|--------------------|--------------------------------------------------------|
| GET    | `/api/assets`      | List/search (`?q=`, `?domain_id=`, `?source_type=`, `?limit=`, `?offset=`) |
| POST   | `/api/assets`      | Register a new asset                                   |
| GET    | `/api/assets/{id}` | Get asset by ID                                        |
| PUT    | `/api/assets/{id}` | Update an asset                                        |
| DELETE | `/api/assets/{id}` | Delete an asset                                        |

### Example: create a domain and register an asset

```bash
# Create domain
curl -X POST http://localhost:8000/api/domains \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: dev-key" \
  -d '{"name": "finance", "owner_email": "team@example.com"}'

# Register asset under that domain
curl -X POST http://localhost:8000/api/assets \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: dev-key" \
  -d '{
    "domain_id": "<domain-id-from-above>",
    "name": "bookings_fact",
    "source_type": "snowflake",
    "description": "Daily bookings fact table",
    "tags": "pii,finance",
    "freshness": "daily"
  }'
```

---

## Configuration

All settings are loaded from environment variables (or `.env` file).

| Variable              | Default                    | Description                        |
|-----------------------|----------------------------|------------------------------------|
| `API_KEY`             | `change-me-in-production`  | Shared API key for write endpoints |
| `DB_PATH`             | `/data/catalog.duckdb`     | Path to DuckDB file                |
| `CORS_ORIGINS`        | `http://localhost:5173`    | Comma-separated allowed origins    |
| `LOG_LEVEL`           | `info`                     | Python log level                   |
| `AUTH_READ_ENDPOINTS` | `false`                    | Require API key for GET endpoints  |

---

## Data Mesh Alignment

| Principle                     | Implementation                                                |
|-------------------------------|---------------------------------------------------------------|
| Domain-oriented ownership     | First-class `Domain` entity; every asset belongs to a domain  |
| Self-service infrastructure   | REST API + UI for registering and discovering assets           |
| Data as a product             | Asset detail shows description, schema, tags, quality, freshness |
| Federated governance          | API-Key auth now; designed for OPA/policy plug-in later       |
| Interoperability              | Supports Snowflake, BigQuery, Redshift, Synapse, Postgres, S3, GCS |

---

## Future Enhancements

- **OAuth2/OIDC** — Replace API-Key with Google or Azure AD auth
- **Lineage** — `lineage_edges` table + React Flow graph visualisation
- **Full-text search** — DuckDB FTS extension
- **Quality monitoring** — Scheduled checks, freshness alerts
- **CI/CD** — GitHub Actions for linting (ruff), testing (pytest), Docker build
- **RBAC** — Role-based access per domain (viewer, editor, admin)
- **Observability** — OpenTelemetry traces + Prometheus metrics

---

See the full design document in [design.md](design.md).
