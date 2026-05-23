# Contributing to datacat

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Development setup

### Prerequisites
- Docker & Docker Compose (easiest path)
- Or: Python 3.12+ and Node 20+

### Quick start

```bash
git clone https://github.com/your-org/datacat.git
cd datacat
cp .env.example .env
# Edit .env — set API_KEY and JWT_SECRET to any non-empty strings for local dev
docker compose up --build
```

- UI: http://localhost:5173
- API docs: http://localhost:8000/docs

### Local dev without Docker

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export API_KEY=dev-key JWT_SECRET=dev-secret DB_PATH=./catalog.duckdb
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

> Update `vite.config.ts` proxy target from `http://backend:8000` to `http://localhost:8000` when running without Docker.

## Running tests

```bash
cd backend
pip install -r requirements.txt
pytest -v
```

## Code style

- **Python**: We use [ruff](https://docs.astral.sh/ruff/) for linting. Run `ruff check .` before submitting.
- **TypeScript**: Standard TypeScript with no special formatter enforced yet.
- Keep commits focused — one logical change per commit.

## Submitting a pull request

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`
2. Make your changes and add/update tests where relevant
3. Ensure `pytest -v` passes
4. Open a PR against `main` — fill out the PR template

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when opening an issue.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Please be respectful.
