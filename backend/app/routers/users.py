import uuid

import duckdb
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_optional, is_platform_team_member
from app.auth_utils import hash_password
from app.database import get_db
from app.schemas import UserCreate, UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


def _require_authenticated(user_email: str | None) -> str:
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_email


@router.get("", response_model=list[UserOut])
def list_users(
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    _require_authenticated(user_email)
    rows = db.execute(
        "SELECT id, email, created_at FROM users ORDER BY created_at DESC"
    ).fetchall()
    return [UserOut(id=r[0], email=r[1], created_at=r[2]) for r in rows]


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    body: UserCreate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    email = _require_authenticated(user_email)
    if not is_platform_team_member(email, db):
        raise HTTPException(status_code=403, detail="Only platform team members can create users")

    existing = db.execute("SELECT id FROM users WHERE email = ?", [body.email]).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO users (id, email, password) VALUES (?, ?, ?)",
        [user_id, body.email, hash_password(body.password)],
    )
    row = db.execute("SELECT id, email, created_at FROM users WHERE id = ?", [user_id]).fetchone()
    return UserOut(id=row[0], email=row[1], created_at=row[2])


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    email = _require_authenticated(user_email)
    if not is_platform_team_member(email, db):
        raise HTTPException(status_code=403, detail="Only platform team members can delete users")

    row = db.execute("SELECT id FROM users WHERE id = ?", [user_id]).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-deletion
    current = db.execute("SELECT id FROM users WHERE email = ?", [email]).fetchone()
    if current and current[0] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    db.execute("DELETE FROM users WHERE id = ?", [user_id])
