# Data Model

All metadata is stored in a single DuckDB file (`catalog.duckdb`). The schema is created and migrated automatically on startup by `database.py`.

---

## Entity Relationships

```
teams 1──────* team_members
teams 1──────* domains
domains 1────* assets
assets 1─────* access_requests
data_layers 1*── assets  (assets.layer_id, nullable)
users (standalone — linked to teams via team_members.email)
```

---

## Tables

### `teams`

Represents an organisational team that owns one or more domains.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR` | PK | UUID, server-generated |
| `name` | `VARCHAR` | NOT NULL | Display name |
| `description` | `VARCHAR` | Default `''` | Optional description |
| `is_platform` | `BOOLEAN` | Default `FALSE` | Internal platform team flag — one per instance |

The **Platform team** is auto-created on first startup. Members of the Platform team have superadmin-equivalent visibility across all teams, domains, and assets.

---

### `team_members`

Maps registered users (by email) to teams and their role within that team.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR` | PK | UUID |
| `team_id` | `VARCHAR` | FK → `teams.id` | Owning team |
| `email` | `VARCHAR` | NOT NULL | Must match a `users.email` |
| `role` | `VARCHAR` | NOT NULL, Default `'member'` | `owner`, `manager`, or `member` |

> **Unique constraint:** `(team_id, email)` — a user can only have one role per team.

#### Roles

| Role | Set by | Capabilities |
|---|---|---|
| `owner` | Automatically on team creation | Full team admin — update/delete the team itself |
| `manager` | Superadmin or team owner | Manage members, create/delete domains, publish assets |
| `member` | Manager | Create, edit, and delete assets within team domains |

---

### `domains`

A business domain (e.g. "Flight Data", "Customer Experience") that groups related data assets.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR` | PK | UUID |
| `name` | `VARCHAR` | UNIQUE, NOT NULL | Must be unique across all domains |
| `description` | `VARCHAR` | Default `''` | Free-text description |
| `owner_email` | `VARCHAR` | Default `''` | Contact email for domain ownership |
| `team_id` | `VARCHAR` | FK → `teams.id`, NOT NULL | Owning team |
| `created_at` | `TIMESTAMP` | Default `now()` | |
| `updated_at` | `TIMESTAMP` | Default `now()` | Updated on every PUT |

---

### `assets`

A data asset (table, view, stream, file, or API) registered in the catalog.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR` | PK | UUID |
| `domain_id` | `VARCHAR` | FK → `domains.id`, NOT NULL | Parent domain |
| `name` | `VARCHAR` | NOT NULL | Asset name (e.g. `booking_transactions`) |
| `description` | `VARCHAR` | Default `''` | Free-text description |
| `source_type` | `VARCHAR` | Default `''` | `snowflake`, `bigquery`, `redshift`, `synapse`, `postgres`, `s3`, `gcs`, `kafka`, `api` |
| `connection_uri` | `VARCHAR` | Default `''` | Connection string or object path |
| `schema_json` | `VARCHAR` | Default `'{}'` | JSON array of `{name, type, nullable, description}` column descriptors |
| `owner_email` | `VARCHAR` | Default `''` | Asset-level owner contact |
| `tags` | `VARCHAR` | Default `''` | Comma-separated tags (e.g. `finance,revenue,daily`) |
| `quality_score` | `DOUBLE` | Nullable | 0.0–1.0 quality indicator |
| `freshness` | `VARCHAR` | Default `''` | e.g. `real-time`, `hourly`, `daily`, `weekly`, `monthly` |
| `published` | `BOOLEAN` | Default `FALSE` | Draft by default; managers explicitly publish |
| `layer_id` | `VARCHAR` | Nullable, FK → `data_layers.id` | Optional data-layer classification; `NULL` = unclassified |
| `created_at` | `TIMESTAMP` | Default `now()` | |
| `updated_at` | `TIMESTAMP` | Default `now()` | Updated on every PUT |

#### `schema_json` format

```json
[
  { "name": "passenger_id", "type": "STRING", "nullable": false, "description": "Unique passenger identifier" },
  { "name": "fare_usd",     "type": "DECIMAL", "nullable": true,  "description": "Ticket price in USD" }
]
```

---

### `data_layers`

Configurable data-layer classifications (medallion-style: landing → bronze → silver → gold). Superadmins can add, rename, recolor, and remove layers; assets reference a layer via `assets.layer_id`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR` | PK | UUID |
| `name` | `VARCHAR` | UNIQUE, NOT NULL | Layer name (e.g. `bronze`) |
| `color` | `VARCHAR` | Default `'#9CA3AF'` | Hex color used for badges/icons |
| `position` | `INTEGER` | Default `0` | Sort order in the UI |
| `created_at` | `TIMESTAMP` | Default `now()` | |

> Four default layers — **landing, bronze, silver, gold** — are seeded on first startup when the table is empty. Deleting a layer sets `layer_id = NULL` on any assets that referenced it (assets are unclassified, never deleted).

---

### `access_requests`

Tracks data consumer requests for access to a published asset.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR` | PK | UUID |
| `asset_id` | `VARCHAR` | FK → `assets.id`, NOT NULL | Target asset |
| `requester_email` | `VARCHAR` | NOT NULL | Requesting user's email |
| `status` | `VARCHAR` | Default `'pending'` | `pending`, `approved`, or `denied` |
| `created_at` | `TIMESTAMP` | Default `now()` | Request submitted time |
| `decision_at` | `TIMESTAMP` | Nullable | Time manager approved/denied |

---

### `users`

Stores credentials for all registered accounts.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR` | PK | UUID |
| `email` | `VARCHAR` | UNIQUE, NOT NULL | Login email |
| `password` | `VARCHAR` | NOT NULL | bcrypt hash |
| `is_superadmin` | `BOOLEAN` | Default `FALSE` | Superadmin flag |
| `name` | `VARCHAR` | Default `''` | Display name |
| `avatar` | `VARCHAR` | Default `''` | Avatar URL or base64 |
| `created_at` | `TIMESTAMP` | Default `now()` | Registration time |

> The **first user to register** is automatically promoted to superadmin. Subsequent promotions must be done by an existing superadmin through the Users page or API.

---

## Migrations

`database.py` runs lightweight `ALTER TABLE` migrations on startup for columns added after the initial schema version. Currently handled migrations:

- `users.is_superadmin` — added in v0.2
- `users.name` — added in v0.2
- `users.avatar` — added in v0.3
- `assets.layer_id` — added with the Data Classification feature (`data_layers` table + default-layer seed)
