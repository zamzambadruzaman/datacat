import uuid
from datetime import datetime, timezone

import duckdb
from fastapi import APIRouter, Depends, HTTPException

from app.auth import (
    get_current_user,
    is_platform_team_member,
    is_team_member,
)
from app.database import get_db
from app.schemas import DomainCreate, DomainOut, DomainUpdate

router = APIRouter(prefix="/api/domains", tags=["domains"])


def _row_to_domain(row: tuple) -> DomainOut:
    return DomainOut(
        id=row[0],
        name=row[1],
        description=row[2],
        team_id=row[3],
        created_at=row[4],
        updated_at=row[5],
    )


@router.get("", response_model=list[DomainOut])
async def list_domains(
    db: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """List all domains (public endpoint)."""
    rows = db.execute(
        "SELECT id, name, description, team_id, created_at, updated_at "
        "FROM domains ORDER BY name"
    ).fetchall()
    return [_row_to_domain(r) for r in rows]


@router.post("", response_model=DomainOut, status_code=201)
async def create_domain(
    body: DomainCreate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Create a new domain (team members only)."""
    # Verify user is member of the team
    if not (is_platform_team_member(user_email, db) or is_team_member(user_email, body.team_id, db)):
        raise HTTPException(status_code=403, detail="Not authorized to create domains in this team")
    
    domain_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    db.execute(
        "INSERT INTO domains (id, name, description, team_id, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        [domain_id, body.name, body.description, body.team_id, now, now],
    )
    return DomainOut(
        id=domain_id,
        name=body.name,
        description=body.description,
        team_id=body.team_id,
        created_at=now,
        updated_at=now,
    )


@router.get("/{domain_id}", response_model=DomainOut)
async def get_domain(
    domain_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Get a domain by ID (public endpoint)."""
    rows = db.execute(
        "SELECT id, name, description, team_id, created_at, updated_at "
        "FROM domains WHERE id = ?",
        [domain_id],
    ).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="Domain not found")
    return _row_to_domain(rows[0])


@router.put("/{domain_id}", response_model=DomainOut)
async def update_domain(
    domain_id: str,
    body: DomainUpdate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Update a domain (team members only)."""
    # Get domain and verify team
    existing = db.execute(
        "SELECT id, team_id FROM domains WHERE id = ?", [domain_id]
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    team_id = existing[1]
    
    # Check authorization: platform team OR domain's team
    if not (is_platform_team_member(user_email, db) or is_team_member(user_email, team_id, db)):
        raise HTTPException(status_code=403, detail="Not authorized to update this domain")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc)
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [domain_id]
    db.execute(f"UPDATE domains SET {set_clause} WHERE id = ?", values)  # noqa: S608

    return await get_domain(domain_id, db)


@router.delete("/{domain_id}", status_code=204)
async def delete_domain(
    domain_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Delete a domain and cascade delete its assets (team members only)."""
    # Get domain and verify team
    existing = db.execute(
        "SELECT id, team_id FROM domains WHERE id = ?", [domain_id]
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    team_id = existing[1]
    
    # Check authorization: platform team OR domain's team
    if not (is_platform_team_member(user_email, db) or is_team_member(user_email, team_id, db)):
        raise HTTPException(status_code=403, detail="Not authorized to delete this domain")
    
    # Cascade delete assets in this domain
    db.execute("DELETE FROM assets WHERE domain_id = ?", [domain_id])
    db.execute("DELETE FROM domains WHERE id = ?", [domain_id])
