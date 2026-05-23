"""Authentication routes – signup and login.

These endpoints are public (no API‑Key required) because they are the entry
point for new users.  Passwords are stored as bcrypt hashes in the ``users``
table.  Successful login returns a JWT bearer token that the frontend stores
in ``localStorage`` and sends on subsequent requests via the ``Authorization``
header.
"""

import uuid
from datetime import timedelta

import duckdb
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.database import get_db
from app.auth_utils import hash_password, verify_password, create_access_token
from app.schemas import TeamCreate, TeamOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(
    email: str,
    password: str,
    db: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Create a new user account.

    The e‑mail must be unique.  The password is hashed with bcrypt before
    storage.  No API‑Key is required – this is the public entry point.
    """
    # Ensure email not already taken
    existing = db.execute("SELECT id FROM users WHERE email = ?", [email]).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    pwd_hash = hash_password(password)
    db.execute(
        "INSERT INTO users (id, email, password) VALUES (?, ?, ?)",
        [user_id, email, pwd_hash],
    )
    return {"id": user_id, "email": email}


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: duckdb.DuckDBPyConnection = Depends(get_db),
):
    """Authenticate a user and return a JWT token.

    ``OAuth2PasswordRequestForm`` expects ``username`` (the e‑mail) and
    ``password`` fields in the request body (application/x‑www‑form‑urlencoded).
    """
    email = form_data.username
    password = form_data.password
    row = db.execute("SELECT password FROM users WHERE email = ?", [email]).fetchone()
    if not row or not verify_password(password, row[0]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(email, expires_delta=timedelta(hours=1))
    return {"access_token": access_token, "token_type": "bearer"}
