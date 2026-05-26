# datacat

A lightweight, self-hosted data catalog built on **Data Mesh** principles.

Discover, register, and govern data assets across domains — with team-based access control, role-based permissions, and a superadmin management UI.

Powered by **FastAPI**, **DuckDB**, and **React**.

---

## Features

- **Domain ownership** — assets are grouped into domains owned by teams
- **Role-based access** — superadmin, manager, and member roles with scoped visibility
- **Asset catalog** — register tables, streams, files, and APIs with schema, tags, quality score, and freshness
- **Publish workflow** — assets are draft by default; managers explicitly publish when ready
- **Access requests** — consumers request access; managers approve or deny
- **Self-hosted** — single Docker Compose command, data stored in a local DuckDB file

---

## Quick Start

```bash
git clone https://github.com/zamzambadruzaman/datacat.git
cd datacat
cp .env.example .env          # set JWT_SECRET and API_KEY
docker compose up --build
```

| Service | URL |
|---|---|
| UI | http://localhost:5173 |
| API docs (Swagger) | http://localhost:8000/docs |
| Health | http://localhost:8000/api/health |

Sign up through the UI — the **first user to register** is automatically granted superadmin access.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python 3.12) |
| Metadata store | DuckDB (single file, zero-config) |
| Auth | JWT Bearer + API Key |
| Frontend | React 18 + Vite + Tailwind CSS |
| Server state | TanStack Query v5 |
| Containers | Docker Compose |

---

## Documentation

| Doc | Description |
|---|---|
| [Architecture](docs/architecture.md) | System design, component layout, Data Mesh alignment, startup sequence |
| [Data Model](docs/data-model.md) | Database schema, tables, relationships, and field descriptions |
| [Access Control](docs/access-control.md) | Roles, permissions, visibility rules, JWT and API key auth |
| [API Reference](docs/api-reference.md) | All endpoints with request/response examples |
| [Configuration](docs/configuration.md) | Environment variables, Docker volume, example `.env` files |
| [Development](docs/development.md) | Local setup, running tests, git workflow, useful commands |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup, code style guide, and how to submit a pull request.
