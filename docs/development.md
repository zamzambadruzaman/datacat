# Development Guide

## Prerequisites

- **Docker & Docker Compose** — easiest path, no local Python or Node needed
- Or: **Python 3.12+** and **Node 20+** for running services directly

---

## Quick start with Docker

```bash
git clone https://github.com/zamzambadruzaman/datacat.git
cd datacat
cp .env.example .env          # edit JWT_SECRET and API_KEY
docker compose up --build
```

| Service | URL |
|---|---|
| UI | http://localhost:5173 |
| API (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/health |

The first user who signs up through the UI is automatically granted superadmin access.

---

## Running locally without Docker

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export JWT_SECRET=dev-secret
export API_KEY=dev-key
export DB_PATH=./catalog.duckdb
export ENABLE_TEST_DATA_ENDPOINT=true

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> **Note:** When running without Docker, update the proxy target in `frontend/vite.config.ts` from `http://backend:8000` to `http://localhost:8000`.

---

## Running tests

```bash
cd backend
pip install -r requirements.txt
pytest -v
```

Tests use an in-memory DuckDB instance (configured in `tests/conftest.py`) so they don't touch your local `catalog.duckdb`.

---

## Code style

### Python

We use [ruff](https://docs.astral.sh/ruff/) for linting.

```bash
cd backend
pip install ruff
ruff check .
ruff check . --fix     # auto-fix safe issues
```

### TypeScript / React

Standard TypeScript — no additional formatter enforced yet. Keep components small and colocated with their types.

---

## Git workflow

- **Never commit directly to `master`.**
- Create a feature or fix branch: `git checkout -b feat/my-feature` or `fix/my-fix`
- **Ask before committing** — show the diff and branch name for review.
- Open a PR against `master` after committing. Fill out the PR template.
- Rebase your branch on `origin/master` before opening the PR:

```bash
git fetch origin
git rebase origin/master
```

---

## Project-specific conventions

### Branching

| Prefix | When to use |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `refactor/` | Code restructuring with no behaviour change |
| `chore/` | Dependency updates, tooling, CI |

### Commit messages

Write in the imperative mood. Focus on the *why*, not just the *what*:

```
Allow superadmins to delete/modify any team

_check_team_owner now short-circuits for superadmins so that
teams without an owner row (seeded directly via SQL) can still
be deleted through the API.
```

### Backend router conventions

- Every router lives in `backend/app/routers/`.
- Use `Depends(get_current_user)` for endpoints that require auth.
- Use `Depends(get_current_user_optional)` for endpoints with optional auth (different response for anon vs authenticated).
- Role checks (`is_superadmin_or_platform`, `is_team_manager`, `is_team_member`) are helper functions in `auth.py` — call them explicitly; don't inline SQL permission checks.

---

## Seed data (dev only)

Enable `ENABLE_TEST_DATA_ENDPOINT=true` in `.env`, then:

```bash
curl -X POST http://localhost:8000/api/test/seed-data
```

⚠️ This **wipes all existing data** (teams, domains, assets, access requests) and inserts a minimal sample dataset. Never enable in production.

---

## Rebuilding Docker images

After backend code changes:

```bash
docker compose build backend
docker compose up backend
```

After frontend dependency changes (`package.json`):

```bash
docker compose build frontend
docker compose up frontend
```

Or rebuild everything:

```bash
docker compose up --build
```

---

## Useful commands

```bash
# View backend logs
docker compose logs -f backend

# Open a Python shell inside the backend container
docker exec -it datacat-backend-1 python3

# Inspect the DuckDB file directly (stop backend first to release the lock)
python3 -c "import duckdb; conn = duckdb.connect('./data/catalog.duckdb'); print(conn.execute('SELECT name FROM teams').fetchall())"

# Run a single test
cd backend && pytest tests/test_api.py::test_health -v
```
