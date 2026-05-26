import uuid
from datetime import datetime, timezone

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import (
    get_current_user,
    get_current_user_optional,
    is_platform_team_member,
    is_superadmin_or_platform,
    is_team_member,
)
from app.database import get_db
from app.schemas import AssetCreate, AssetOut, AssetUpdate
from app.schemas import AccessRequestCreate, AccessRequestOut

router = APIRouter(prefix="/api/assets", tags=["assets"])

_COLS = (
    "id, domain_id, name, description, source_type, connection_uri, "
    "schema_json, owner_email, tags, quality_score, freshness, published, created_at, updated_at, layer_id"
)
_QCOLS = ", ".join(f"a.{c.strip()}" for c in _COLS.split(","))


def _row_to_asset(row: tuple) -> AssetOut:
    return AssetOut(
        id=row[0],
        domain_id=row[1],
        name=row[2],
        description=row[3],
        source_type=row[4],
        connection_uri=row[5],
        schema_json=row[6],
        owner_email=row[7],
        tags=row[8],
        quality_score=row[9],
        freshness=row[10],
        published=row[11],
        created_at=row[12],
        updated_at=row[13],
        layer_id=row[14],
    )


@router.get("", response_model=list[AssetOut])
async def list_assets(
    q: str | None = Query(None, description="Search asset name/description"),
    domain_id: str | None = Query(None),
    source_type: str | None = Query(None),
    layer_id: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    """List assets with proper access control.

    * Unauthenticated users see only published assets.
    * Platform team members see all assets.
    * Regular team members see assets belonging to their teams (via domain.team_id).
    """
    where_parts: list[str] = []
    params: list[object] = []
    if domain_id:
        where_parts.append("a.domain_id = ?")
        params.append(domain_id)
    if source_type:
        where_parts.append("a.source_type = ?")
        params.append(source_type)
    if layer_id:
        where_parts.append("a.layer_id = ?")
        params.append(layer_id)
    if q:
        where_parts.append("(a.name ILIKE ? OR a.description ILIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])

    # Access control
    if not user_email:
        # Public viewer – only published assets
        where_parts.append("a.published = TRUE")
    else:
        # Authenticated user – check if platform team
        if not is_superadmin_or_platform(user_email, db):
            # Restrict to assets whose domain belongs to a team the user is a member of
            team_rows = db.execute(
                "SELECT team_id FROM team_members WHERE email = ?", [user_email]
            ).fetchall()
            team_ids = [row[0] for row in team_rows]
            if team_ids:
                placeholders = ",".join(["?"] * len(team_ids))
                # Published assets are visible to all; own-team assets are always visible
                where_parts.append(f"(a.published = TRUE OR d.team_id IN ({placeholders}))")
                params.extend(team_ids)
            else:
                # No team membership – only published assets
                where_parts.append("a.published = TRUE")

    where_clause = f" WHERE {' AND '.join(where_parts)}" if where_parts else ""
    # Join assets with domains to enforce team filtering
    query = (
        f"SELECT {_QCOLS}, d.name FROM assets a JOIN domains d ON a.domain_id = d.id"
        f"{where_clause} ORDER BY a.name LIMIT ? OFFSET ?"
    )  # noqa: S608
    params.extend([limit, offset])

    ncols = len(_COLS.split(", "))
    rows = db.execute(query, params).fetchall()
    assets = [_row_to_asset(r[:ncols]) for r in rows]
    for asset, row in zip(assets, rows):
        asset.domain_name = row[ncols]
    return assets

# ---------------------------------------------------------------------------
# Publish / Unpublish endpoints – toggle the ``published`` flag
# ---------------------------------------------------------------------------

@router.post("/{asset_id}/publish", response_model=AssetOut)
def publish_asset(
    asset_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Publish an asset to the global catalog (team members only)."""
    # Get asset with its domain and team info
    asset_row = db.execute(
        "SELECT a.id, d.team_id FROM assets a "
        "JOIN domains d ON a.domain_id = d.id WHERE a.id = ?",
        [asset_id],
    ).fetchone()
    
    if not asset_row:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    team_id = asset_row[1]
    
    # Check if user is platform team member or belongs to the asset's team
    if not (is_superadmin_or_platform(user_email, db) or is_team_member(user_email, team_id, db)):
        raise HTTPException(status_code=403, detail="Not authorized to publish this asset")
    
    db.execute("UPDATE assets SET published = TRUE, updated_at = current_timestamp WHERE id = ?", [asset_id])
    return get_asset_internal(asset_id, db)


@router.post("/{asset_id}/unpublish", response_model=AssetOut)
def unpublish_asset(
    asset_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Unpublish an asset from the global catalog (team members only)."""
    # Get asset with its domain and team info
    asset_row = db.execute(
        "SELECT a.id, d.team_id FROM assets a "
        "JOIN domains d ON a.domain_id = d.id WHERE a.id = ?",
        [asset_id],
    ).fetchone()
    
    if not asset_row:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    team_id = asset_row[1]
    
    # Check if user is platform team member or belongs to the asset's team
    if not (is_superadmin_or_platform(user_email, db) or is_team_member(user_email, team_id, db)):
        raise HTTPException(status_code=403, detail="Not authorized to unpublish this asset")
    
    db.execute("UPDATE assets SET published = FALSE, updated_at = current_timestamp WHERE id = ?", [asset_id])
    return get_asset_internal(asset_id, db)


@router.post("", response_model=AssetOut, status_code=201)
async def create_asset(
    body: AssetCreate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Create a new asset (team members only)."""
    # Verify domain exists and get its team
    domain_row = db.execute("SELECT id, team_id FROM domains WHERE id = ?", [body.domain_id]).fetchone()
    if not domain_row:
        raise HTTPException(status_code=400, detail="Domain not found")
    
    team_id = domain_row[1]
    
    # Check if user is platform team member or belongs to the domain's team
    if not (is_superadmin_or_platform(user_email, db) or is_team_member(user_email, team_id, db)):
        raise HTTPException(status_code=403, detail="Not authorized to create assets in this domain")

    asset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    db.execute(
        "INSERT INTO assets "
        "(id, domain_id, name, description, source_type, connection_uri, "
        "schema_json, owner_email, tags, quality_score, freshness, layer_id, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            asset_id, body.domain_id, body.name, body.description,
            body.source_type, body.connection_uri, body.schema_json,
            body.owner_email, body.tags, body.quality_score, body.freshness,
            body.layer_id, now, now,
        ],
    )
    return get_asset_internal(asset_id, db, user_email)


@router.get("/{asset_id}", response_model=AssetOut)
async def get_asset(
    asset_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    """Get a specific asset (public endpoint - returns published assets to all, all assets to team members)."""
    return get_asset_internal(asset_id, db, user_email)


def get_asset_internal(
    asset_id: str,
    db: duckdb.DuckDBPyConnection,
    user_email: str | None = None,
) -> AssetOut:
    """Internal helper to get an asset with proper access control.

    * Unauthenticated users can only retrieve published assets.
    * Platform team members can retrieve any asset.
    * Regular users can retrieve assets belonging to a team they are a member of.
    """
    # Join with domains to obtain the owning team_id for access checks
    rows = db.execute(
        f"SELECT {_QCOLS}, d.team_id, d.name FROM assets a "
        "JOIN domains d ON a.domain_id = d.id WHERE a.id = ?",  # noqa: S608
        [asset_id],
    ).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset_row = rows[0]
    ncols = len(_COLS.split(", "))
    asset = _row_to_asset(asset_row[:ncols])
    team_id = asset_row[ncols]
    asset.domain_name = asset_row[ncols + 1]

    # Access control
    if not user_email:
        if not asset.published:
            raise HTTPException(status_code=404, detail="Asset not found")
    else:
        can_access = (
            asset.published
            or is_superadmin_or_platform(user_email, db)
            or is_team_member(user_email, team_id, db)
        )
        if not can_access:
            raise HTTPException(status_code=404, detail="Asset not found")

    asset.team_id = team_id
    return asset


@router.put("/{asset_id}", response_model=AssetOut)
async def update_asset(
    asset_id: str,
    body: AssetUpdate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Update an asset (team members only)."""
    # Get asset with its domain and team info
    asset_row = db.execute(
        "SELECT a.id, d.team_id FROM assets a "
        "JOIN domains d ON a.domain_id = d.id WHERE a.id = ?",
        [asset_id],
    ).fetchone()
    
    if not asset_row:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    team_id = asset_row[1]
    
    # Check if user is platform team member or belongs to the asset's team
    if not (is_superadmin_or_platform(user_email, db) or is_team_member(user_email, team_id, db)):
        raise HTTPException(status_code=403, detail="Not authorized to update this asset")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc)
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [asset_id]
    db.execute(f"UPDATE assets SET {set_clause} WHERE id = ?", values)  # noqa: S608

    return get_asset_internal(asset_id, db, user_email)


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(
    asset_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str = Depends(get_current_user),
):
    """Delete an asset (team members only)."""
    # Get asset with its domain and team info
    asset_row = db.execute(
        "SELECT a.id, d.team_id FROM assets a "
        "JOIN domains d ON a.domain_id = d.id WHERE a.id = ?",
        [asset_id],
    ).fetchone()
    
    if not asset_row:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    team_id = asset_row[1]
    
    # Check if user is platform team member or belongs to the asset's team
    if not (is_superadmin_or_platform(user_email, db) or is_team_member(user_email, team_id, db)):
        raise HTTPException(status_code=403, detail="Not authorized to delete this asset")
    
    db.execute("DELETE FROM assets WHERE id = ?", [asset_id])
