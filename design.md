# datacat — Design Document

> A lightweight, self-hosted data catalog built on Data Mesh principles.

---

## 1. Overview

**Goal** — A modern, self-hosted data catalog that helps teams discover, understand,
and govern their data assets. Built around Data Mesh principles with domain
ownership, self-service registration, and federated governance.

### Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend API | **FastAPI** (Python 3.12) | Async, auto OpenAPI docs, Pydantic v2 validation |
| Metadata store | **DuckDB** (single file) | Zero-config, fast OLAP queries, embeddable |
| Auth | **API-Key** (`X-API-KEY` header) | Prototype-ready; swappable for OAuth2/OIDC |
| Frontend | **React 18 + Vite + Tailwind CSS** | Fast builds, utility-first CSS, no heavy component lib |
| Containerisation | **Docker Compose** | One-command local environment |

---

## 2. Architecture

```
+--------------+       HTTP/JSON       +---------------+       SQL        +-----------+
|   React UI   | <------------------> |   FastAPI      | <--------------> |  DuckDB   |
|  (Vite dev)  |   /api proxy         |   Backend      |                  |  (file)   |
+--------------+                      +---------------+                  +-----------+
     :5173                                 :8000                       catalog.duckdb
```

All services share a single Docker network. Vite proxies `/api` to the backend
during development.

---

## 3. Data Mesh Alignment

| Principle | How datacat implements it |
|---|---|
| **Domain-oriented ownership** | First-class `Domain` entity; every asset belongs to a domain. Domain owners manage their own assets. |
| **Self-service infrastructure** | REST API + UI for registering assets, tagging, uploading schemas. |
| **Data as a product** | Asset detail view shows description, owner, tags, schema, freshness, and quality score. |
| **Federated governance** | API-Key auth now; designed for OPA / external policy plug-in later. Global tags & glossary for cross-domain consistency. |
| **Interoperability** | `source_type` enum covers Snowflake, BigQuery, Redshift, Synapse, PostgreSQL, S3, GCS. |

---

## 4. Data Model

```
Domain  1------* Asset
```

### Tables

#### `domains`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK, server-generated |
| `name` | `VARCHAR` | Unique, slugified |
| `description` | `VARCHAR` | Optional |
| `owner_email` | `VARCHAR` | Domain owner contact |
| `created_at` | `TIMESTAMP` | Default now |
| `updated_at` | `TIMESTAMP` | Auto-updated |

#### `assets`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `domain_id` | `UUID` | FK -> domains |
| `name` | `VARCHAR` | e.g. `bookings_fact` |
| `description` | `VARCHAR` | Free text |
| `source_type` | `VARCHAR` | Enum: snowflake, bigquery, redshift, synapse, postgres, s3, gcs |
| `connection_uri` | `VARCHAR` | Encrypted at rest (future) |
| `schema_json` | `JSON` | Column-level schema |
| `owner_email` | `VARCHAR` | Asset-level owner |
| `tags` | `VARCHAR[]` | Comma-separated tag strings |
| `quality_score` | `FLOAT` | 0.0-1.0, nullable |
| `freshness` | `VARCHAR` | e.g. `daily`, `hourly`, `real-time` |
| `created_at` | `TIMESTAMP` | |
| `updated_at` | `TIMESTAMP` | |

---

## 5. Backend Design

### 5.1 Project Layout

```
datacat/
  backend/
    app/
      __init__.py
      main.py          # FastAPI app, middleware, lifespan
      config.py         # Pydantic Settings (env-based)
      database.py       # DuckDB engine + session
      models.py         # SQLModel table definitions
      schemas.py        # Pydantic request/response schemas
      auth.py           # API-Key dependency
      routers/
        __init__.py
        domains.py      # /api/domains
        assets.py       # /api/assets
        health.py       # /api/health
    requirements.txt
    Dockerfile
    tests/
      conftest.py
      test_assets.py
```

### 5.2 Key Modules

| Module | Responsibility |
|---|---|
| `config.py` | Load settings from env vars via `pydantic-settings` |
| `database.py` | Create DuckDB engine, yield `Session` via dependency |
| `models.py` | SQLModel table classes (`Domain`, `Asset`) |
| `schemas.py` | Pydantic v2 input/output schemas with validation |
| `auth.py` | `X-API-KEY` header validation dependency |
| `routers/domains.py` | Domain CRUD endpoints |
| `routers/assets.py` | Asset CRUD + search endpoints |
| `routers/health.py` | Liveness/readiness probes |

### 5.3 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness probe |
| `GET` | `/api/domains` | List all domains |
| `POST` | `/api/domains` | Create a domain |
| `GET` | `/api/domains/{id}` | Get domain detail |
| `PUT` | `/api/domains/{id}` | Update a domain |
| `DELETE` | `/api/domains/{id}` | Delete a domain |
| `GET` | `/api/assets` | List/search assets (`?q=`, `?domain_id=`, `?source_type=`) |
| `POST` | `/api/assets` | Register a new asset |
| `GET` | `/api/assets/{id}` | Get asset detail |
| `PUT` | `/api/assets/{id}` | Update an asset |
| `DELETE` | `/api/assets/{id}` | Delete an asset |

All mutating endpoints require `X-API-KEY`. Read endpoints are open by default
(configurable via `AUTH_READ_ENDPOINTS=true`).

---

## 6. Frontend Design

### 6.1 Project Layout

```
datacat/
  frontend/
    index.html
    package.json
    vite.config.ts
    tailwind.config.js
    tsconfig.json
    Dockerfile
    src/
      main.tsx
      App.tsx
      api.ts             # Fetch wrapper with API-Key
      components/
        Layout.tsx       # Nav bar, sidebar, theme toggle
        DomainList.tsx
        AssetList.tsx
        AssetDetail.tsx
        AssetForm.tsx    # Create/edit asset
        SearchBar.tsx
      pages/
        HomePage.tsx
        AssetsPage.tsx
        DomainsPage.tsx
```

### 6.2 Routing

| Path | Component | Description |
|---|---|---|
| `/` | `HomePage` | Dashboard with stats & recent assets |
| `/assets` | `AssetsPage` | Searchable asset list |
| `/assets/:id` | `AssetDetail` | Full asset view with schema viewer |
| `/assets/new` | `AssetForm` | Register new asset |
| `/domains` | `DomainsPage` | Domain list & management |

### 6.3 State Management

- **TanStack Query (React Query v5)** for server state (caching, refetch, pagination).
- **React Router v6** for routing.
- **Tailwind CSS** for styling — no heavy component library needed.

---

## 7. Docker & Deployment

### 7.1 docker-compose.yml

```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes: ["./data:/data"]
    env_file: .env

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    depends_on: [backend]
```

### 7.2 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `API_KEY` | `change-me-in-production` | Shared API key |
| `DB_PATH` | `/data/catalog.duckdb` | DuckDB file location |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed origins |
| `LOG_LEVEL` | `info` | Python logging level |

### 7.3 Running Locally

```bash
cp .env.example .env        # Edit API_KEY
docker compose up --build    # Start everything
```

- UI: http://localhost:5173
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

---

## 8. Future Enhancements

| Area | Plan |
|---|---|
| **Auth** | OAuth2/OIDC via Google or Azure AD |
| **Lineage** | `lineage_edges` table + React Flow graph |
| **Search** | DuckDB FTS extension for full-text search |
| **Quality** | Scheduled quality checks, freshness monitoring |
| **CI/CD** | GitHub Actions: ruff lint, pytest, Docker build & push |
| **Observability** | OpenTelemetry traces + Prometheus metrics |
| **RBAC** | Role-based access per domain (viewer, editor, admin) |

---

## 9. Quick Start Checklist

1. Clone the repo and `cd datacat/`
2. Copy `.env.example` to `.env` and set `API_KEY`
3. Run `docker compose up --build`
4. Open http://localhost:5173
5. Create a domain via the UI or `POST /api/domains`
6. Register assets under that domain
