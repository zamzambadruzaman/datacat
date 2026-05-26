# API Reference

All endpoints are served from the backend at `:8000`. In Docker Compose the frontend proxies `/api` there automatically.

Interactive docs (Swagger UI) are available at **http://localhost:8000/docs**.

---

## Authentication

### Bearer token (recommended for user sessions)

```http
Authorization: Bearer <jwt-token>
```

Obtain a token via `POST /api/auth/login`.

### API key (recommended for scripts / CI)

```http
X-API-KEY: <api-key>
```

The `API_KEY` value is set in your `.env` file. Requests are attributed to `DEFAULT_USER_EMAIL`.

---

## Auth

### `POST /api/auth/signup`

Register a new user account. The **first** user to register becomes superadmin automatically.

**Request body**

```json
{
  "email": "user@example.com",
  "password": "strongpassword",
  "name": "Jane Smith"
}
```

**Response `201`**

```json
{ "id": "uuid", "email": "user@example.com", "is_superadmin": false }
```

---

### `POST /api/auth/login`

Authenticate and receive a JWT token. Uses OAuth2 password form encoding.

**Request body** (`application/x-www-form-urlencoded`)

```
username=user@example.com&password=strongpassword
```

**Response `200`**

```json
{ "access_token": "<jwt>", "token_type": "bearer" }
```

---

## Users

All `/api/users` management endpoints (except `/me` and `/search`) are **superadmin only**.

### `GET /api/users/me`

Returns the current user's profile.

**Response `200`**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Smith",
  "is_superadmin": false,
  "teams": [{ "id": "uuid", "name": "Flight Operations", "role": "manager" }]
}
```

### `PUT /api/users/me`

Update display name or avatar.

```json
{ "name": "Jane Smith", "avatar": "https://..." }
```

### `PUT /api/users/me/password`

Change your own password.

```json
{ "current_password": "old", "new_password": "new" }
```

### `GET /api/users/search?q=<email>`

Autocomplete user search by email prefix. Used internally by the add-member form.

### `GET /api/users` *(superadmin)*

List all users with their team assignments.

### `POST /api/users` *(superadmin)*

Create a user account directly (bypasses sign-up flow).

```json
{ "email": "user@example.com", "password": "pass", "name": "Name" }
```

### `PUT /api/users/{id}/superadmin` *(superadmin)*

Promote or revoke superadmin status. Cannot demote yourself.

```json
{ "is_superadmin": true }
```

### `POST /api/users/{id}/teams` *(superadmin)*

Assign a user to a team with a role.

```json
{ "team_id": "uuid", "role": "manager" }
```

Valid roles: `manager`, `member`.

### `DELETE /api/users/{id}/teams/{team_id}` *(superadmin)*

Remove a user from a specific team.

### `DELETE /api/users/{id}` *(superadmin)*

Delete a user account and all their team memberships. Cannot delete yourself.

---

## Teams

### `GET /api/teams`

List teams. Superadmins see all teams. Regular users see only teams they belong to.

**Response `200`**

```json
[
  { "id": "uuid", "name": "Flight Operations", "description": "...", "is_platform": false }
]
```

### `POST /api/teams`

Create a new team. The creator is automatically added as owner.

```json
{ "name": "Revenue Management", "description": "Pricing and revenue analytics" }
```

**Response `201`** — `TeamOut`

### `PUT /api/teams/{id}` *(owner)*

Update team name or description.

```json
{ "name": "New Name", "description": "Updated description" }
```

### `DELETE /api/teams/{id}` *(owner or superadmin)*

Delete a team. Cascade-deletes all domains and assets belonging to it.

---

## Team Members

### `GET /api/teams/{team_id}/members`

List members of a team. Requires team membership.

**Response `200`**

```json
[
  { "id": "uuid", "team_id": "uuid", "email": "ops@catairways.com", "role": "manager" }
]
```

### `POST /api/teams/{team_id}/members` *(manager)*

Add a user to the team. The user must already have a registered account.

```json
{ "email": "user@example.com", "role": "member" }
```

Valid roles: `manager`, `member`.

### `PUT /api/teams/{team_id}/members/{email}` *(manager)*

Update a member's role.

```json
{ "role": "manager" }
```

### `DELETE /api/teams/{team_id}/members/{email}` *(manager)*

Remove a member from the team.

---

## Domains

### `GET /api/domains`

List domains. Superadmins see all; regular users see only their teams' domains.

**Response `200`**

```json
[
  {
    "id": "uuid",
    "name": "Flight Data",
    "description": "...",
    "team_id": "uuid",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]
```

### `POST /api/domains` *(manager)*

Create a domain under a team. The caller must be a manager of the specified team.

```json
{
  "name": "Flight Data",
  "description": "Flight schedules, real-time status, and aircraft registry",
  "team_id": "uuid"
}
```

**Response `201`** — `DomainOut`

### `GET /api/domains/{id}`

Get a single domain by ID. Requires team membership.

### `PUT /api/domains/{id}` *(manager)*

Update domain name or description.

```json
{ "name": "Updated Name", "description": "Updated description" }
```

### `DELETE /api/domains/{id}` *(manager)*

Delete a domain and **cascade-delete all assets** within it.

---

## Data Layers

Configurable data-layer classifications (medallion-style: landing → bronze → silver → gold). Reading is available to any authenticated user; all writes are **superadmin only**. Assets reference a layer via `assets.layer_id`.

### `GET /api/layers`

List all layers ordered by `position`.

**Response `200`**

```json
[
  { "id": "uuid", "name": "bronze", "color": "#B45309", "position": 1 }
]
```

### `POST /api/layers` *(superadmin)*

Create a layer. `name` must be unique (case-insensitive). New layers are appended to the end (`position = max + 1`).

```json
{ "name": "platinum", "color": "#22D3EE" }
```

**Response `201`** — `DataLayerOut`. Returns `409` if the name already exists.

### `PUT /api/layers/{id}` *(superadmin)*

Rename, recolor, or reorder a layer. All fields optional.

```json
{ "name": "diamond", "color": "#3B82F6", "position": 4 }
```

### `DELETE /api/layers/{id}` *(superadmin)*

Remove a layer. Any assets referencing it have their `layer_id` set to `NULL` (assets become unclassified, they are **not** deleted).

**Response `204`**

---

## Assets

### `GET /api/assets`

List and search assets. **No auth required** — but only returns **published** assets to unauthenticated callers. Authenticated users see their team's unpublished assets too.

**Query parameters**

| Param | Description |
|---|---|
| `q` | Case-insensitive search across name and description |
| `domain_id` | Filter by domain UUID |
| `source_type` | Filter by source type (e.g. `bigquery`, `snowflake`) |
| `layer_id` | Filter by data-layer UUID (see [Data Layers](#data-layers)) |

**Response `200`**

```json
[
  {
    "id": "uuid",
    "domain_id": "uuid",
    "domain_name": "Flight Data",
    "name": "Master Flight Schedule",
    "description": "...",
    "source_type": "snowflake",
    "connection_uri": "catairways_dw.ops.flight_schedule",
    "schema_json": "[...]",
    "owner_email": "ops@catairways.com",
    "tags": "flight,schedule,operations",
    "quality_score": 0.98,
    "freshness": "daily",
    "published": true,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
    "team_id": "uuid",
    "layer_id": "uuid"
  }
]
```

`layer_id` is `null` when the asset is unclassified.

### `POST /api/assets` *(member+)*

Register a new asset. The caller must be a member of the domain's owning team.

```json
{
  "domain_id": "uuid",
  "name": "Booking Transactions",
  "description": "All confirmed bookings with fare and channel data",
  "source_type": "bigquery",
  "connection_uri": "catairways_dw.sales.bookings",
  "schema_json": "[{\"name\":\"pnr\",\"type\":\"STRING\"},{\"name\":\"fare_usd\",\"type\":\"DECIMAL\"}]",
  "owner_email": "rm@catairways.com",
  "tags": "bookings,revenue",
  "quality_score": 0.97,
  "freshness": "hourly",
  "layer_id": "uuid"
}
```

`layer_id` is optional — omit or set `null` to leave the asset unclassified. It can also be set/changed later via `PUT /api/assets/{id}`.

**Response `201`** — `AssetOut`

Assets are **unpublished (draft)** by default.

### `GET /api/assets/{id}`

Get a single asset by ID. Requires team membership for unpublished assets.

### `PUT /api/assets/{id}` *(member+)*

Update any asset field. Only team members can update.

### `DELETE /api/assets/{id}` *(member+)*

Delete an asset. Cascade-deletes any pending access requests.

### `POST /api/assets/{id}/publish` *(manager)*

Publish a draft asset, making it visible to all authenticated users and the public list.

**Response `200`** — updated `AssetOut` with `"published": true`

### `POST /api/assets/{id}/unpublish` *(manager)*

Revert a published asset to draft. Hides it from non-team members.

---

## Access Requests

### `POST /api/assets/{id}/access-requests`

Submit an access request for a published asset.

```json
{ "requester_email": "analyst@example.com" }
```

**Response `201`**

```json
{
  "id": "uuid",
  "asset_id": "uuid",
  "requester_email": "analyst@example.com",
  "status": "pending",
  "created_at": "2026-01-01T00:00:00Z",
  "decision_at": null
}
```

### `GET /api/access-requests`

List access requests. Managers see requests for their team's assets. Users see their own requests.

### `PUT /api/access-requests/{id}` *(manager)*

Approve or deny a request.

```json
{ "status": "approved" }
```

Valid statuses: `approved`, `denied`.

---

## Health

### `GET /api/health`

Liveness probe. No auth required.

**Response `200`**

```json
{ "status": "ok" }
```

---

## Development Endpoints

These endpoints are only registered when `ENABLE_TEST_DATA_ENDPOINT=true` in `.env`. **Never enable in production.**

### `POST /api/test/seed-data`

⚠️ **Destructive** — wipes all teams, domains, assets, and access requests, then inserts a small sample dataset. Useful for resetting a dev environment.
