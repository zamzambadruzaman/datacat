# datacat

A lightweight, self-hosted data catalog built on **Data Mesh** principles.

Discover, register, and govern data assets across domains — with team-based access control,
role-based permissions, and a superadmin management UI.

Powered by **FastAPI**, **DuckDB**, and **React**.

---

## Features

- **User accounts** — sign up / log in with email and password (JWT-based)
- **Superadmin** — first registered user is automatically promoted; superadmins manage all users, teams, and roles
- **Teams & roles** — users belong to teams with a `manager` or `member` role
  - **Manager** — create/edit/delete domains, manage team membership
  - **Member** — manage assets within the team's domains
- **Scoped visibility** — users only see teams, domains, and assets that belong to their own teams; superadmins see everything
- **Asset catalog** — register data assets (Snowflake, BigQuery, Redshift, Synapse, Postgres, S3, GCS) with schema, tags, quality score, and freshness
- **Access requests** — users can request access to assets; managers approve or deny
- **Publish / unpublish** — assets are draft by default; managers publish when ready

---

## Project Structure

```
datacat/
├── backend/                   # Python API server
│   ├── app/
│   │   ├── main.py            # FastAPI application & middleware
│   │   ├── config.py          # Environment-based settings (pydantic-settings)
│   │   ├── database.py        # DuckDB connection, schema init & migrations
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── auth.py            # JWT auth + role helpers
│   │   ├── auth_utils.py      # Password hashing (bcrypt)
│   │   └── routers/
│   │       ├── health.py      # GET /api/health
│   │       ├── auth.py        # Login / signup
│   │       ├── users.py       # User management + team assignment
│   │       ├── team.py        # Team CRUD
│   │       ├── team_members.py# Team membership management
│   │       ├── domains.py     # Domain CRUD
│   │       └── assets.py      # Asset CRUD + search + publish
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
│   │   ├── components/
│   │   │   ├── Layout.tsx     # Nav bar (superadmin-aware)
│   │   │   ├── DomainList.tsx
│   │   │   ├── AssetList.tsx
│   │   │   ├── AssetDetail.tsx
│   │   │   ├── AssetForm.tsx
│   │   │   └── TeamDetail.tsx # Team members + add-member autocomplete
│   │   └── pages/
│   │       ├── LoginPage.tsx  # Login / sign-up tabs
│   │       ├── HomePage.tsx
│   │       ├── AssetsPage.tsx
│   │       ├── DomainsPage.tsx
│   │       ├── TeamsPage.tsx
│   │       └── UsersPage.tsx  # Superadmin: user table, team assignment, promote
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start (Docker)

```bash
cp .env.example .env        # fill in JWT_SECRET and other values
docker compose up --build
```

| Service  | URL                             |
|----------|---------------------------------|
| UI       | http://localhost:5173           |
| API docs | http://localhost:8000/docs      |
| Health   | http://localhost:8000/api/health|

On first run, **sign up** through the UI. The first user to register is automatically granted superadmin access.

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

JWT_SECRET=dev-secret DB_PATH=./catalog.duckdb uvicorn app.main:app --reload --port 8000
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

---

## Access Control

### Roles

| Role           | Who                              | Permissions |
|----------------|----------------------------------|-------------|
| **Superadmin** | Assigned manually or first user  | Full access: manage all users, teams, domains, assets |
| **Manager**    | Team member with manager role    | Manage team membership, create/edit/delete domains, full asset access within team |
| **Member**     | Team member with member role     | Create/edit/delete assets within team domains |

### Visibility rules

- **Superadmin** — sees all teams, domains, and assets across the platform
- **Authenticated user** — sees only teams they belong to, and the domains and assets within those teams
- **Unauthenticated** — no access (401 on all endpoints)

---

## User Management (Superadmin)

The **Users** page (`/users`) is visible only to superadmins. From there you can:

- **Create users** — add a new account with email + password
- **Promote / revoke superadmin** — per-user toggle (self-demotion blocked)
- **Assign to team** — pick a team and role (manager or member); updates role if already assigned
- **Remove from team** — click the × on any team badge in the user row
- **Delete user** — removes the account and all team memberships (cannot delete yourself)

---

## API Reference

All endpoints require a valid **JWT Bearer token** (obtained from `POST /api/auth/login`).  
Programmatic access can also use the `X-API-KEY` header.

### Auth

| Method | Path               | Description                        |
|--------|--------------------|------------------------------------|
| POST   | `/api/auth/login`  | Login — returns `access_token`     |
| POST   | `/api/auth/signup` | Register a new account             |

### Users

| Method | Path                            | Auth required     | Description                         |
|--------|---------------------------------|-------------------|-------------------------------------|
| GET    | `/api/users/me`                 | Any user          | Current user profile                |
| GET    | `/api/users/search?q=`          | Any user          | Search registered users by email    |
| GET    | `/api/users`                    | Superadmin        | List all users with team assignments|
| POST   | `/api/users`                    | Superadmin        | Create a user account               |
| PUT    | `/api/users/{id}/superadmin`    | Superadmin        | Promote or demote superadmin status |
| POST   | `/api/users/{id}/teams`         | Superadmin        | Assign user to a team with a role   |
| DELETE | `/api/users/{id}/teams/{tid}`   | Superadmin        | Remove user from a team             |
| DELETE | `/api/users/{id}`               | Superadmin        | Delete user account                 |

### Teams

| Method | Path                              | Auth required  | Description             |
|--------|-----------------------------------|----------------|-------------------------|
| GET    | `/api/teams`                      | Any user       | List teams (scoped)     |
| POST   | `/api/teams`                      | Any user       | Create a team           |
| PUT    | `/api/teams/{id}`                 | Manager        | Update team details     |
| DELETE | `/api/teams/{id}`                 | Superadmin     | Delete a team           |
| GET    | `/api/teams/{id}/members`         | Team member    | List team members       |
| POST   | `/api/teams/{id}/members`         | Manager        | Add a member            |
| PUT    | `/api/teams/{id}/members/{email}` | Manager        | Change a member's role  |
| DELETE | `/api/teams/{id}/members/{email}` | Manager        | Remove a member         |

### Domains

| Method | Path                | Auth required  | Description              |
|--------|---------------------|----------------|--------------------------|
| GET    | `/api/domains`      | Any user       | List domains (scoped)    |
| POST   | `/api/domains`      | Manager        | Create a domain          |
| GET    | `/api/domains/{id}` | Team member    | Get domain by ID         |
| PUT    | `/api/domains/{id}` | Manager        | Update a domain          |
| DELETE | `/api/domains/{id}` | Manager        | Delete domain + assets   |

### Assets

| Method | Path                        | Auth required  | Description                                          |
|--------|-----------------------------|----------------|------------------------------------------------------|
| GET    | `/api/assets`               | Any user       | List/search (`?q=`, `?domain_id=`, `?source_type=`)  |
| POST   | `/api/assets`               | Member+        | Register a new asset                                 |
| GET    | `/api/assets/{id}`          | Team member    | Get asset by ID                                      |
| PUT    | `/api/assets/{id}`          | Member+        | Update an asset                                      |
| DELETE | `/api/assets/{id}`          | Member+        | Delete an asset                                      |
| POST   | `/api/assets/{id}/publish`  | Manager        | Publish an asset                                     |
| POST   | `/api/assets/{id}/unpublish`| Manager        | Unpublish an asset                                   |

### Health

| Method | Path          | Description    |
|--------|---------------|----------------|
| GET    | `/api/health` | Liveness probe |

---

## Configuration

All settings are read from environment variables or a `.env` file. See `.env.example` for the full list.

| Variable                    | Default                     | Description                               |
|-----------------------------|-----------------------------|-------------------------------------------|
| `JWT_SECRET`                | *(required)*                | Secret key for signing JWT tokens         |
| `JWT_EXPIRE_MINUTES`        | `60`                        | Token expiry in minutes                   |
| `API_KEY`                   | `change-me-in-production`   | API key for programmatic access           |
| `DB_PATH`                   | `/data/catalog.duckdb`      | Path to DuckDB file                       |
| `DEFAULT_USER_EMAIL`        | `admin@example.com`         | Default user for API-key requests         |
| `CORS_ORIGINS`              | `http://localhost:5173`     | Comma-separated allowed origins           |
| `LOG_LEVEL`                 | `info`                      | Python log level                          |
| `ENABLE_TEST_DATA_ENDPOINT` | `false`                     | Enable `/api/test/seed-data` (dev only)   |

> **Warning:** Startup logs a warning if `API_KEY` or `JWT_SECRET` are left at their default values.

---

## Tech Stack

| Layer          | Technology                    | Purpose                              |
|----------------|-------------------------------|--------------------------------------|
| Backend API    | FastAPI (Python 3.12)         | Async REST API, auto OpenAPI docs    |
| Metadata store | DuckDB (single file)          | Zero-config embedded OLAP database   |
| Auth           | JWT (Bearer) + API Key        | User sessions + programmatic access  |
| Frontend       | React 18 + Vite + Tailwind    | Fast dev builds, utility-first CSS   |
| State          | TanStack Query (React Query)  | Server state, caching, mutations     |
| Containers     | Docker Compose                | One-command local environment        |

---

## Data Mesh Alignment

| Principle                 | Implementation                                                        |
|---------------------------|-----------------------------------------------------------------------|
| Domain-oriented ownership | First-class `Domain` entity; every asset belongs to a domain + team  |
| Self-service infrastructure | REST API + UI for registering and discovering assets               |
| Data as a product         | Asset detail shows schema, tags, quality score, freshness, publish state |
| Federated governance      | Team managers own their domain data; superadmin for platform-wide policy |
| Interoperability          | Supports Snowflake, BigQuery, Redshift, Synapse, Postgres, S3, GCS  |

---

## Future Enhancements

- **OAuth2 / OIDC** — SSO via Google or Azure AD
- **Lineage** — `lineage_edges` table + React Flow graph visualisation
- **Full-text search** — DuckDB FTS extension
- **Quality monitoring** — Scheduled freshness checks and alerting
- **Observability** — OpenTelemetry traces + Prometheus metrics
- **GitHub Actions CI** — lint (ruff), test (pytest), Docker build on PR

---

See [CONTRIBUTING.md](CONTRIBUTING.md) to set up a local dev environment and submit a PR.
