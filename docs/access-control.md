# Access Control

datacat uses a layered permission model: JWT-based authentication, team membership, and role-based authorisation. Every API endpoint checks the caller's identity and role before allowing an action.

---

## Authentication

All protected endpoints require a valid **JWT Bearer token** obtained from `POST /api/auth/login`.

```
Authorization: Bearer <token>
```

Alternatively, programmatic access (scripts, CI pipelines) can use the shared API key:

```
X-API-KEY: <api-key>
```

API-key requests are attributed to the `DEFAULT_USER_EMAIL` configured in the environment. Set `API_KEY` to a strong value in production.

Token expiry is controlled by `JWT_EXPIRE_MINUTES` (default: 60 minutes).

---

## Roles

### Superadmin

- Assigned automatically to the **first user to register** on a fresh instance.
- Can be manually granted or revoked by any existing superadmin from the Users page.
- Sees **all** teams, domains, and assets across the entire platform.
- Can create, update, and delete anything regardless of team membership.

### Platform Team Member

- Members of the internal **Platform** team (auto-created on startup).
- Have the same global visibility and permissions as superadmins.
- Useful for data platform engineers who need cross-team access without being a superadmin.

### Team Owner

- Automatically assigned to the user who **creates** a team.
- Can update and delete the team itself.
- Implicitly has all manager permissions within that team.

### Manager

- Assigned by a team owner or superadmin.
- Can add/remove team members and change their roles.
- Can create, update, and delete domains within their team.
- Can publish and unpublish assets within team domains.
- Can approve or deny access requests for team assets.

### Member

- Assigned by a manager.
- Can create, update, and delete assets within team domains.
- Cannot publish assets or manage team membership.

---

## Visibility Rules

| Resource | Superadmin / Platform | Team member | Non-member |
|---|---|---|---|
| Teams | All teams | Own teams only | 401 |
| Domains | All domains | Team's domains only | 401 |
| Assets (published) | All | Team's domains | Visible via public `/api/assets` |
| Assets (unpublished) | All | Team's domains only | Hidden |
| Users | All | Own profile only | 401 |
| Access requests | All | Own team's assets | Own requests only |

> **Public asset browsing:** `GET /api/assets` (no auth) returns only **published** assets. Unpublished assets are invisible to non-members.

---

## Permission Matrix

| Action | Member | Manager | Owner | Superadmin |
|---|---|---|---|---|
| View own profile | ✅ | ✅ | ✅ | ✅ |
| View team's domains & assets | ✅ | ✅ | ✅ | ✅ |
| Create asset | ✅ | ✅ | ✅ | ✅ |
| Edit / delete asset | ✅ | ✅ | ✅ | ✅ |
| Publish / unpublish asset | ❌ | ✅ | ✅ | ✅ |
| Create / edit / delete domain | ❌ | ✅ | ✅ | ✅ |
| Add / remove team members | ❌ | ✅ | ✅ | ✅ |
| Update / delete team | ❌ | ❌ | ✅ | ✅ |
| Manage all users | ❌ | ❌ | ❌ | ✅ |
| Promote / demote superadmin | ❌ | ❌ | ❌ | ✅ |
| Delete any team (ownerless) | ❌ | ❌ | ❌ | ✅ |

---

## Access Requests

Any authenticated user can request access to a **published** asset they don't already have access to.

1. User submits `POST /api/assets/{id}/access-requests`.
2. The request is created with status `pending`.
3. A manager of the asset's team reviews and calls `PUT /api/access-requests/{id}` with `approved` or `denied`.
4. The requester's status is updated and (if SMTP is configured) they receive an email notification.

---

## JWT Details

Tokens are signed with `HS256` using the `JWT_SECRET` environment variable. The payload contains:

```json
{ "sub": "user@example.com" }
```

The `get_current_user` FastAPI dependency decodes the token and returns the user's email, which is then passed to role-check helpers (`is_superadmin_or_platform`, `is_team_manager`, `is_team_member`).
