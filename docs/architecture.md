# Architecture

## Overview

datacat is a lightweight, self-hosted data catalog built on Data Mesh principles. It follows a simple three-tier architecture: a React frontend, a FastAPI backend, and a DuckDB metadata store — all wired together via Docker Compose.

```
┌──────────────────┐        HTTP / JSON        ┌─────────────────┐        SQL       ┌────────────────┐
│   React (Vite)   │ ◄───────────────────────► │    FastAPI      │ ◄──────────────► │    DuckDB      │
│   :5173          │   /api proxy (dev)        │    :8000        │                  │ catalog.duckdb │
└──────────────────┘                           └─────────────────┘                  └────────────────┘
```

In Docker Compose, both services share a single network. The frontend proxies all `/api` requests to the backend via Vite's dev server proxy. The DuckDB file lives on a host-mounted volume (`./data`) so data persists across container restarts.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend API | FastAPI (Python 3.12) | Async, auto OpenAPI docs, Pydantic v2 validation |
| Metadata store | DuckDB (single file) | Zero-config embedded OLAP, no separate DB process |
| Auth | JWT (Bearer) + API Key | User sessions + programmatic / CI access |
| Frontend | React 18 + Vite + Tailwind CSS | Fast dev builds, utility-first styling |
| Server state | TanStack Query (React Query v5) | Caching, background refetch, mutations |
| Routing | React Router v6 | Client-side SPA routing |
| Containers | Docker Compose | One-command local environment |

---

## Backend Layout

```
backend/
├── app/
│   ├── main.py           # FastAPI app, CORS middleware, router registration, lifespan
│   ├── config.py         # Pydantic Settings — loads all env vars
│   ├── database.py       # DuckDB connection singleton, schema init & migrations
│   ├── schemas.py        # Pydantic request/response models
│   ├── auth.py           # JWT helpers, role-check functions
│   ├── auth_utils.py     # bcrypt password hashing
│   └── routers/
│       ├── health.py         # GET /api/health
│       ├── auth.py           # POST /api/auth/login, /api/auth/signup
│       ├── users.py          # User management (superadmin)
│       ├── team.py           # Team CRUD
│       ├── team_members.py   # Team membership management
│       ├── domains.py        # Domain CRUD
│       ├── assets.py         # Asset CRUD + publish/unpublish
│       ├── access_requests.py# Access request workflow
│       └── test_data.py      # Seed endpoint (dev only, gated by env var)
├── tests/
│   ├── conftest.py       # Fixtures and DB reset helpers
│   └── test_api.py       # Integration tests
├── requirements.txt
└── Dockerfile
```

### Key modules

| Module | Responsibility |
|---|---|
| `main.py` | Bootstraps the FastAPI app, registers routers, starts DB on lifespan |
| `config.py` | Reads all env vars via `pydantic-settings`; warns on weak secrets at startup |
| `database.py` | Creates the DuckDB connection singleton, runs table migrations, bootstraps the platform team and first superadmin |
| `schemas.py` | All Pydantic v2 input/output models shared across routers |
| `auth.py` | JWT decode/encode, `get_current_user` FastAPI dependency, `is_superadmin_or_platform`, `is_team_manager`, `is_team_member` helpers |
| `auth_utils.py` | `hash_password` / `verify_password` (bcrypt) |

---

## Frontend Layout

```
frontend/
├── src/
│   ├── main.tsx              # ReactDOM.render entry point
│   ├── App.tsx               # Route definitions
│   ├── api.ts                # Typed fetch wrapper (attaches Bearer token)
│   ├── components/
│   │   ├── Layout.tsx        # Navigation bar, superadmin-aware links
│   │   ├── AssetList.tsx     # Filterable asset table
│   │   ├── AssetDetail.tsx   # Asset detail panel with schema viewer
│   │   ├── AssetForm.tsx     # Create / edit asset form
│   │   ├── DomainList.tsx    # Domain cards
│   │   ├── TeamList.tsx      # Team cards
│   │   ├── TeamDetail.tsx    # Members list + add-member autocomplete
│   │   ├── SearchBar.tsx     # Global search input
│   │   └── AccessRequestForm.tsx # Request access to an asset
│   └── pages/
│       ├── LoginPage.tsx     # Login / sign-up tabs
│       ├── HomePage.tsx      # Dashboard — stats and recent assets
│       ├── AssetsPage.tsx    # /assets — list + search
│       ├── DomainsPage.tsx   # /domains — domain management
│       ├── ProfilePage.tsx   # /profile — current user settings
│       └── UsersPage.tsx     # /users — superadmin user management
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── Dockerfile
```

### Routing

| Path | Page | Notes |
|---|---|---|
| `/login` | `LoginPage` | Public — login and sign-up tabs |
| `/` | `HomePage` | Stats cards + recent published assets |
| `/assets` | `AssetsPage` | Searchable, filterable asset list |
| `/domains` | `DomainsPage` | Domain list; managers can create/delete |
| `/profile` | `ProfilePage` | Update name, avatar, change password |
| `/users` | `UsersPage` | Superadmin only — user + team management |

---

## Data Mesh Alignment

| Principle | Implementation |
|---|---|
| **Domain-oriented ownership** | First-class `Domain` entity; every asset belongs to a domain owned by a team |
| **Self-service infrastructure** | REST API + UI for registering and discovering assets without central gatekeeper |
| **Data as a product** | Asset detail shows description, owner, schema, tags, quality score, freshness, and publish state |
| **Federated governance** | Team managers own their domains; superadmin handles platform-wide policy |
| **Interoperability** | `source_type` covers Snowflake, BigQuery, Redshift, Synapse, Postgres, S3, GCS, Kafka, and API sources |

---

## Startup Sequence

1. Docker Compose starts `backend` first; frontend waits for the backend healthcheck.
2. On first request, `get_connection()` opens (or creates) `catalog.duckdb`.
3. `_init_tables()` creates all tables and runs any pending column migrations.
4. `_create_platform_team()` inserts the internal Platform team if absent.
5. `_bootstrap_superadmin()` promotes the earliest registered user to superadmin if none exists yet.
6. FastAPI begins accepting requests on `:8000`.
7. Frontend Vite server starts on `:5173` and proxies `/api` to `:8000`.
