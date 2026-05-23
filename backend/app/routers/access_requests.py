"""Router handling access‑request submissions.

When a data consumer wants to use an asset they can POST a request with their
email address and an optional message.  The endpoint stores the request in the
``access_requests`` table and sends an e‑mail to the asset owner using the
``send_email`` helper defined in ``app.__init__``.
"""

import uuid
from datetime import datetime

import duckdb
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.schemas import AccessRequestCreate, AccessRequestOut
from app import send_email

router = APIRouter(prefix="/api/access-requests", tags=["access-requests"])


@router.post("", response_model=AccessRequestOut, status_code=201)
def create_access_request(
    payload: AccessRequestCreate,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Submit an access request for a data asset (public endpoint)."""
    # Verify the asset exists
    asset = db.execute("SELECT id, owner_email, name FROM assets WHERE id = ?", [payload.asset_id]).fetchone()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    request_id = str(uuid.uuid4())
    now = datetime.utcnow()
    db.execute(
        "INSERT INTO access_requests (id, asset_id, requester_email, status, created_at) VALUES (?, ?, ?, ?, ?)",
        [request_id, payload.asset_id, payload.requester_email, "pending", now],
    )

    # Send notification e‑mail to the asset owner
    owner_email = asset[1]
    asset_name = asset[2]
    subject = f"Access request for data asset: {asset_name}"
    body = (
        f"User {payload.requester_email} has requested access to the data asset '{asset_name}'.\n\n"
        f"Message: {payload.message or '(none)'}\n\n"
        f"Please review the request in the datacat UI."
    )
    send_email(to=owner_email, subject=subject, body=body)

    return AccessRequestOut(
        id=request_id,
        asset_id=payload.asset_id,
        requester_email=payload.requester_email,
        status="pending",
        created_at=now,
        decision_at=None,
    )
