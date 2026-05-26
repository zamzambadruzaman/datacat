import uuid

import duckdb
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_optional, is_superadmin_or_platform
from app.database import get_db
from app.schemas import DataLayerCreate, DataLayerOut, DataLayerUpdate

router = APIRouter(prefix="/api/layers", tags=["layers"])


def _require_auth(user_email: str | None) -> str:
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_email


def _require_superadmin(user_email: str, db: duckdb.DuckDBPyConnection) -> None:
    if not is_superadmin_or_platform(user_email, db):
        raise HTTPException(status_code=403, detail="Superadmin access required")


def _row(r: tuple) -> DataLayerOut:
    return DataLayerOut(id=r[0], name=r[1], color=r[2], position=r[3])


@router.get("", response_model=list[DataLayerOut])
def list_layers(
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    _require_auth(user_email)
    rows = db.execute(
        "SELECT id, name, color, position FROM data_layers ORDER BY position, name"
    ).fetchall()
    return [_row(r) for r in rows]


@router.post("", response_model=DataLayerOut, status_code=201)
def create_layer(
    body: DataLayerCreate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    email = _require_auth(user_email)
    _require_superadmin(email, db)

    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    exists = db.execute("SELECT 1 FROM data_layers WHERE LOWER(name) = LOWER(?)", [name]).fetchone()
    if exists:
        raise HTTPException(status_code=409, detail="A layer with that name already exists")

    next_pos = db.execute("SELECT COALESCE(MAX(position), -1) + 1 FROM data_layers").fetchone()[0]
    layer_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO data_layers (id, name, color, position) VALUES (?, ?, ?, ?)",
        [layer_id, name, body.color, next_pos],
    )
    row = db.execute("SELECT id, name, color, position FROM data_layers WHERE id = ?", [layer_id]).fetchone()
    return _row(row)


@router.put("/{layer_id}", response_model=DataLayerOut)
def update_layer(
    layer_id: str,
    body: DataLayerUpdate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    email = _require_auth(user_email)
    _require_superadmin(email, db)

    if not db.execute("SELECT 1 FROM data_layers WHERE id = ?", [layer_id]).fetchone():
        raise HTTPException(status_code=404, detail="Layer not found")

    updates = body.model_dump(exclude_unset=True)
    if "name" in updates:
        updates["name"] = updates["name"].strip()
        clash = db.execute(
            "SELECT 1 FROM data_layers WHERE LOWER(name) = LOWER(?) AND id <> ?",
            [updates["name"], layer_id],
        ).fetchone()
        if clash:
            raise HTTPException(status_code=409, detail="A layer with that name already exists")
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    db.execute(
        f"UPDATE data_layers SET {set_clause} WHERE id = ?",  # noqa: S608
        list(updates.values()) + [layer_id],
    )
    row = db.execute("SELECT id, name, color, position FROM data_layers WHERE id = ?", [layer_id]).fetchone()
    return _row(row)


@router.delete("/{layer_id}", status_code=204)
def delete_layer(
    layer_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
    user_email: str | None = Depends(get_current_user_optional),
):
    email = _require_auth(user_email)
    _require_superadmin(email, db)

    if not db.execute("SELECT 1 FROM data_layers WHERE id = ?", [layer_id]).fetchone():
        raise HTTPException(status_code=404, detail="Layer not found")

    # Unclassify any assets referencing this layer, then remove it.
    db.execute("UPDATE assets SET layer_id = NULL WHERE layer_id = ?", [layer_id])
    db.execute("DELETE FROM data_layers WHERE id = ?", [layer_id])
