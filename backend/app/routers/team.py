"""Router for managing tenant teams.

Each team can own multiple domains.  The endpoints are protected by the API‑Key
auth just like the other routers. When a team is created, the creator is added
as an owner member.
"""

import uuid
import duckdb
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.database import get_db
from app.schemas import TeamCreate, TeamUpdate, TeamOut

router = APIRouter(prefix="/api/teams", tags=["teams"])


def _check_team_owner(team_id: str, user_email: str, db: duckdb.DuckDBPyConnection) -> None:
    """Verify the user is an owner of the team."""
    member = db.execute(
        "SELECT role FROM team_members WHERE team_id = ? AND email = ?",
        [team_id, user_email],
    ).fetchone()
    if not member or member[0] != "owner":
        raise HTTPException(status_code=403, detail="Only team owners can modify this team")


@router.get("", response_model=list[TeamOut])
def list_teams(db: duckdb.DuckDBPyConnection = Depends(get_db)):
    """List all teams (public endpoint)."""
    rows = db.execute("SELECT id, name, description, is_platform FROM teams").fetchall()
    return [TeamOut(id=row[0], name=row[1], description=row[2], is_platform=row[3]) for row in rows]


@router.post("", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
def create_team(
    body: TeamCreate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    team_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO teams (id, name, description, is_platform) VALUES (?, ?, ?, ?)",
        [team_id, body.name, body.description, False],
    )
    
    # Auto-add creator as owner
    member_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO team_members (id, team_id, email, role) VALUES (?, ?, ?, ?)",
        [member_id, team_id, user_email, "owner"],
    )
    
    return TeamOut(id=team_id, name=body.name, description=body.description, is_platform=False)


@router.put("/{team_id}", response_model=TeamOut)
def update_team(
    team_id: str,
    body: TeamUpdate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    _check_team_owner(team_id, user_email, db)
    
    existing = db.execute("SELECT id, is_platform FROM teams WHERE id = ?", [team_id]).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    if existing[1]:  # is_platform
        raise HTTPException(status_code=403, detail="Cannot modify platform team")
    
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    db.execute(f"UPDATE teams SET {set_clause} WHERE id = ?", list(updates.values()) + [team_id])  # noqa: S608
    row = db.execute("SELECT id, name, description, is_platform FROM teams WHERE id = ?", [team_id]).fetchone()
    return TeamOut(id=row[0], name=row[1], description=row[2], is_platform=row[3])


@router.delete("/{team_id}", status_code=204)
def delete_team(
    team_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    _check_team_owner(team_id, user_email, db)
    
    existing = db.execute("SELECT id, is_platform FROM teams WHERE id = ?", [team_id]).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    if existing[1]:  # is_platform
        raise HTTPException(status_code=403, detail="Cannot delete platform team")
    
    # Cascade delete – remove domains and assets belonging to the team
    db.execute("DELETE FROM assets WHERE domain_id IN (SELECT id FROM domains WHERE team_id = ?)", [team_id])
    db.execute("DELETE FROM domains WHERE team_id = ?", [team_id])
    db.execute("DELETE FROM team_members WHERE team_id = ?", [team_id])
    db.execute("DELETE FROM teams WHERE id = ?", [team_id])