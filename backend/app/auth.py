import hmac
import duckdb

from fastapi import Depends, HTTPException, Security, Header
from fastapi.security import APIKeyHeader

from app.config import settings
from fastapi import Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .auth_utils import verify_password, create_access_token, decode_access_token

_api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)
_bearer_scheme = HTTPBearer(auto_error=False)


async def require_api_key(
    api_key: str | None = Security(_api_key_header),
) -> str:
    """Require a valid API key for write operations."""
    if api_key is None or not hmac.compare_digest(api_key, settings.api_key):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return api_key


async def optional_api_key(
    api_key: str | None = Security(_api_key_header),
) -> str | None:
    """Optional API key - don't raise if missing."""
    return api_key


async def get_current_user(
    _key: str = Depends(require_api_key),
    token: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    """Extract current user e‑mail from a JWT bearer token.

    If a valid token is present, its ``sub`` claim (the e‑mail) is returned.
    If no token is supplied, we fall back to the default user (useful for
    quick testing without auth).  Invalid or expired tokens raise 401.
    """
    if token:
        email = decode_access_token(token.credentials)
        if email:
            return email
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    # No token – use the default (development mode)
    return settings.default_user_email


async def get_current_user_optional(
    token: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str | None:
    """Optional version of :func:`get_current_user` – returns ``None`` if no
    bearer token is supplied.  Used for public read endpoints.
    """
    if token:
        return decode_access_token(token.credentials)
    return None


def is_platform_team_member(user_email: str, db: duckdb.DuckDBPyConnection) -> bool:
    """Check if user is a member of the platform team."""
    result = db.execute(
        "SELECT 1 FROM team_members tm "
        "JOIN teams t ON tm.team_id = t.id "
        "WHERE tm.email = ? AND t.is_platform = TRUE",
        [user_email],
    ).fetchone()
    return result is not None


def is_team_member(user_email: str, team_id: str, db: duckdb.DuckDBPyConnection) -> bool:
    """Check if user is a member of a specific team."""
    result = db.execute(
        "SELECT 1 FROM team_members WHERE team_id = ? AND email = ?",
        [team_id, user_email],
    ).fetchone()
    return result is not None
