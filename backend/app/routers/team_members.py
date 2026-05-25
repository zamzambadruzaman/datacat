"""Router for managing team members and their roles.

Roles:
  manager – can do anything within the team (manage members, domains, assets)
  member  – can manage assets only
"""

import uuid

import duckdb
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, is_platform_team_member, is_team_manager
from app.database import get_db
from app.schemas import TeamMemberCreate, TeamMemberOut, TeamMemberUpdate

router = APIRouter(prefix="/api/teams/{team_id}/members", tags=["team-members"])


def _require_manager(team_id: str, user_email: str, db: duckdb.DuckDBPyConnection) -> None:
    """Raise 403 unless the caller is a team manager or platform team member."""
    if not (is_platform_team_member(user_email, db) or is_team_manager(user_email, team_id, db)):
        raise HTTPException(status_code=403, detail="Only team managers can manage members")


@router.get("", response_model=list[TeamMemberOut])
def list_team_members(
    team_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """List all members of a team (public endpoint)."""
    if not db.execute("SELECT id FROM teams WHERE id = ?", [team_id]).fetchone():
        raise HTTPException(status_code=404, detail="Team not found")
    rows = db.execute(
        "SELECT id, team_id, email, role FROM team_members WHERE team_id = ? ORDER BY email",
        [team_id],
    ).fetchall()
    return [TeamMemberOut(id=r[0], team_id=r[1], email=r[2], role=r[3]) for r in rows]


@router.post("", response_model=TeamMemberOut, status_code=status.HTTP_201_CREATED)
def add_team_member(
    team_id: str,
    body: TeamMemberCreate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Add a member to the team (managers only)."""
    _require_manager(team_id, user_email, db)

    if body.role not in ("manager", "member"):
        raise HTTPException(status_code=400, detail="Role must be 'manager' or 'member'")

    # Verify user account exists
    if not db.execute("SELECT id FROM users WHERE email = ?", [body.email]).fetchone():
        raise HTTPException(status_code=400, detail="No user account found for that email")

    member_id = str(uuid.uuid4())
    try:
        db.execute(
            "INSERT INTO team_members (id, team_id, email, role) VALUES (?, ?, ?, ?)",
            [member_id, team_id, body.email, body.role],
        )
    except Exception:
        raise HTTPException(status_code=400, detail="User is already a member of this team")

    return TeamMemberOut(id=member_id, team_id=team_id, email=body.email, role=body.role)


@router.put("/{member_email}", response_model=TeamMemberOut)
def update_team_member_role(
    team_id: str,
    member_email: str,
    body: TeamMemberUpdate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Update a member's role (managers only)."""
    _require_manager(team_id, user_email, db)

    if body.role not in ("manager", "member"):
        raise HTTPException(status_code=400, detail="Role must be 'manager' or 'member'")

    row = db.execute(
        "SELECT id FROM team_members WHERE team_id = ? AND email = ?",
        [team_id, member_email],
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Member not found")

    db.execute(
        "UPDATE team_members SET role = ? WHERE team_id = ? AND email = ?",
        [body.role, team_id, member_email],
    )
    return TeamMemberOut(id=row[0], team_id=team_id, email=member_email, role=body.role)


@router.delete("/{member_email}", status_code=204)
def remove_team_member(
    team_id: str,
    member_email: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Remove a member from the team (managers only)."""
    _require_manager(team_id, user_email, db)
    db.execute(
        "DELETE FROM team_members WHERE team_id = ? AND email = ?",
        [team_id, member_email],
    )
