import uuid

import duckdb
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_optional, is_superadmin, is_superadmin_or_platform
from app.auth_utils import hash_password
from app.database import get_db
from app.schemas import UserCreate, UserOut, UserTeamAssign, UserTeamMembership

router = APIRouter(prefix="/api/users", tags=["users"])


def _require_auth(user_email: str | None) -> str:
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_email


def _require_superadmin(user_email: str, db: duckdb.DuckDBPyConnection) -> None:
    if not is_superadmin_or_platform(user_email, db):
        raise HTTPException(status_code=403, detail="Superadmin access required")


def _row_to_user(row: tuple) -> UserOut:
    return UserOut(id=row[0], email=row[1], is_superadmin=bool(row[2]), created_at=row[3])


@router.get("/me")
def get_me(
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    """Return the current user's profile including superadmin status."""
    email = _require_auth(user_email)
    row = db.execute(
        "SELECT id, email, is_superadmin, created_at FROM users WHERE email = ?", [email]
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": row[0],
        "email": row[1],
        "is_superadmin": bool(row[2]),
        "created_at": row[3],
    }


@router.get("", response_model=list[UserOut])
def list_users(
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    """List all users with their team assignments — superadmin only."""
    email = _require_auth(user_email)
    _require_superadmin(email, db)

    # Fetch all users
    users = db.execute(
        "SELECT id, email, is_superadmin, created_at FROM users ORDER BY created_at"
    ).fetchall()

    # Fetch all non-platform team memberships in one query
    memberships = db.execute(
        "SELECT tm.email, t.id, t.name, tm.role "
        "FROM team_members tm JOIN teams t ON tm.team_id = t.id "
        "WHERE t.is_platform = FALSE ORDER BY t.name"
    ).fetchall()

    # Group memberships by user email
    teams_by_email: dict[str, list[UserTeamMembership]] = {}
    for m in memberships:
        teams_by_email.setdefault(m[0], []).append(
            UserTeamMembership(team_id=m[1], team_name=m[2], role=m[3])
        )

    return [
        UserOut(
            id=r[0],
            email=r[1],
            is_superadmin=bool(r[2]),
            teams=teams_by_email.get(r[1], []),
            created_at=r[3],
        )
        for r in users
    ]


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    body: UserCreate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    """Create a user account (superadmin only)."""
    email = _require_auth(user_email)
    _require_superadmin(email, db)

    if db.execute("SELECT id FROM users WHERE email = ?", [body.email]).fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO users (id, email, password) VALUES (?, ?, ?)",
        [user_id, body.email, hash_password(body.password)],
    )
    row = db.execute(
        "SELECT id, email, is_superadmin, created_at FROM users WHERE id = ?", [user_id]
    ).fetchone()
    return _row_to_user(row)


@router.put("/{user_id}/superadmin", response_model=UserOut)
def set_superadmin(
    user_id: str,
    promote: bool,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    """Promote or demote a user's superadmin status (superadmin only)."""
    email = _require_auth(user_email)
    _require_superadmin(email, db)

    row = db.execute(
        "SELECT id, email FROM users WHERE id = ?", [user_id]
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-demotion
    if row[1] == email and not promote:
        raise HTTPException(status_code=400, detail="Cannot remove your own superadmin status")

    db.execute("UPDATE users SET is_superadmin = ? WHERE id = ?", [promote, user_id])
    updated = db.execute(
        "SELECT id, email, is_superadmin, created_at FROM users WHERE id = ?", [user_id]
    ).fetchone()
    return _row_to_user(updated)


@router.post("/{user_id}/teams", status_code=201)
def assign_to_team(
    user_id: str,
    body: UserTeamAssign,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    """Assign a user to a team with a role (superadmin only)."""
    email = _require_auth(user_email)
    _require_superadmin(email, db)

    if body.role not in ("manager", "member"):
        raise HTTPException(status_code=400, detail="Role must be 'manager' or 'member'")

    target = db.execute("SELECT email FROM users WHERE id = ?", [user_id]).fetchone()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if not db.execute("SELECT id FROM teams WHERE id = ?", [body.team_id]).fetchone():
        raise HTTPException(status_code=404, detail="Team not found")

    target_email = target[0]
    existing = db.execute(
        "SELECT id FROM team_members WHERE team_id = ? AND email = ?",
        [body.team_id, target_email],
    ).fetchone()

    if existing:
        # Update role if already a member
        db.execute(
            "UPDATE team_members SET role = ? WHERE team_id = ? AND email = ?",
            [body.role, body.team_id, target_email],
        )
        member_id = existing[0]
    else:
        member_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO team_members (id, team_id, email, role) VALUES (?, ?, ?, ?)",
            [member_id, body.team_id, target_email, body.role],
        )

    team = db.execute("SELECT name FROM teams WHERE id = ?", [body.team_id]).fetchone()
    return {
        "id": member_id,
        "user_email": target_email,
        "team_id": body.team_id,
        "team_name": team[0],
        "role": body.role,
    }


@router.delete("/{user_id}/teams/{team_id}", status_code=204)
def remove_from_team(
    user_id: str,
    team_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    """Remove a user from a team (superadmin only)."""
    email = _require_auth(user_email)
    _require_superadmin(email, db)

    target = db.execute("SELECT email FROM users WHERE id = ?", [user_id]).fetchone()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    db.execute(
        "DELETE FROM team_members WHERE team_id = ? AND email = ?",
        [team_id, target[0]],
    )


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    """Delete a user account (superadmin only)."""
    email = _require_auth(user_email)
    _require_superadmin(email, db)

    row = db.execute("SELECT id, email FROM users WHERE id = ?", [user_id]).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row[1] == email:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    db.execute("DELETE FROM team_members WHERE email = ?", [row[1]])
    db.execute("DELETE FROM users WHERE id = ?", [user_id])
