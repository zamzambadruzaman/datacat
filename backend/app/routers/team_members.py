"""Router for managing team members and their roles.

Team members can be either 'owner' (can manage the team) or 'member' (can read/publish assets).
"""

import uuid
import duckdb
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.database import get_db
from app.schemas import TeamMemberCreate, TeamMemberOut

router = APIRouter(prefix="/api/teams/{team_id}/members", tags=["team-members"])


def _check_team_owner(team_id: str, user_email: str, db: duckdb.DuckDBPyConnection) -> None:
    """Verify the user is an owner of the team."""
    member = db.execute(
        "SELECT role FROM team_members WHERE team_id = ? AND email = ?",
        [team_id, user_email],
    ).fetchone()
    if not member or member[0] != "owner":
        raise HTTPException(status_code=403, detail="Only team owners can manage members")


@router.get("", response_model=list[TeamMemberOut])
def list_team_members(
    team_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """List all members of a team (public endpoint)."""
    team = db.execute("SELECT id FROM teams WHERE id = ?", [team_id]).fetchone()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    rows = db.execute(
        "SELECT id, team_id, email, role FROM team_members WHERE team_id = ? ORDER BY email",
        [team_id],
    ).fetchall()
    return [TeamMemberOut(id=row[0], team_id=row[1], email=row[2], role=row[3]) for row in rows]


@router.post("", response_model=TeamMemberOut, status_code=status.HTTP_201_CREATED)
def add_team_member(
    team_id: str,
    body: TeamMemberCreate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Add a member to the team (owner only)."""
    # Check owner
    _check_team_owner(team_id, user_email, db)
    
    member_id = str(uuid.uuid4())
    try:
        db.execute(
            "INSERT INTO team_members (id, team_id, email, role) VALUES (?, ?, ?, ?)",
            [member_id, team_id, body.email, body.role],
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Member already exists in this team")
    
    return TeamMemberOut(id=member_id, team_id=team_id, email=body.email, role=body.role)


@router.delete("/{member_email}", status_code=204)
def remove_team_member(
    team_id: str,
    member_email: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Remove a member from the team (owner only)."""
    # Check owner
    _check_team_owner(team_id, user_email, db)
    
    db.execute("DELETE FROM team_members WHERE team_id = ? AND email = ?", [team_id, member_email])
