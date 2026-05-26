# Configuration

All settings are loaded from environment variables or a `.env` file at the project root. Copy `.env.example` to `.env` and fill in your values before starting the app.

```bash
cp .env.example .env
```

---

## Environment Variables

### Required secrets

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | *(none)* | Secret key for signing JWT tokens. Use a long random string (32+ chars). |
| `API_KEY` | `change-me-in-production` | Shared key for `X-API-KEY` header access (scripts, CI). |

> **Warning:** datacat logs a startup warning if either secret is left at its default value. Set both to strong values before any non-local deployment.

Generate a secure secret:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

### Database

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `/data/catalog.duckdb` | Path to the DuckDB file. In Docker this is inside the mounted volume. For local dev, use a relative path like `./catalog.duckdb`. |

---

### HTTP / CORS

| Variable | Default | Description |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed origins for CORS. Add your production domain here. |

Example for multiple origins:
```
CORS_ORIGINS=https://catalog.catairways.com,https://staging.catairways.com
```

---

### Auth

| Variable | Default | Description |
|---|---|---|
| `JWT_EXPIRE_MINUTES` | `60` | How long a JWT token is valid (minutes). |
| `AUTH_READ_ENDPOINTS` | `false` | Set to `true` to require authentication on all GET endpoints (including public asset browsing). |
| `DEFAULT_USER_EMAIL` | `user@example.com` | Email attributed to requests made with `X-API-KEY`. |

---

### Logging

| Variable | Default | Description |
|---|---|---|
| `LOG_LEVEL` | `info` | Python logging level: `debug`, `info`, `warning`, `error`, `critical`. |

---

### Email / SMTP (optional)

Used to send notifications when access requests are approved or denied. All fields are optional — if `SMTP_HOST` is not set, email notifications are silently skipped.

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | `localhost` | SMTP server hostname |
| `SMTP_PORT` | `25` | SMTP server port |
| `SMTP_USER` | `''` | SMTP authentication username |
| `SMTP_PASSWORD` | `''` | SMTP authentication password |
| `EMAIL_FROM` | `no-reply@datacat.local` | Sender address for outgoing emails |

---

### Development only

| Variable | Default | Description |
|---|---|---|
| `ENABLE_TEST_DATA_ENDPOINT` | `false` | Enables `POST /api/test/seed-data` — **destructive**, wipes all data. Never enable in production. |

---

## Example `.env` for local development

```env
JWT_SECRET=dev-jwt-secret-not-for-production
API_KEY=dev-api-key

DB_PATH=./catalog.duckdb
CORS_ORIGINS=http://localhost:5173

LOG_LEVEL=debug
JWT_EXPIRE_MINUTES=1440

ENABLE_TEST_DATA_ENDPOINT=true
DEFAULT_USER_EMAIL=admin@datacat.local
```

---

## Example `.env` for production

```env
JWT_SECRET=<64-char random hex>
API_KEY=<32-char random hex>

DB_PATH=/data/catalog.duckdb
CORS_ORIGINS=https://catalog.yourcompany.com

LOG_LEVEL=info
JWT_EXPIRE_MINUTES=60
AUTH_READ_ENDPOINTS=true

SMTP_HOST=smtp.yourcompany.com
SMTP_PORT=587
SMTP_USER=datacat@yourcompany.com
SMTP_PASSWORD=<smtp-password>
EMAIL_FROM=datacat@yourcompany.com
```

---

## Docker volume

The DuckDB file is stored in a Docker-managed volume mapped to `./data` on the host:

```yaml
volumes:
  - ./data:/data
```

Back up `./data/catalog.duckdb` regularly. There is no replication or WAL shipping in the default setup.
