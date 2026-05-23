"""Utility functions for user authentication.

We use **passlib** (bcrypt) for password hashing and **PyJWT** for token
generation/verification.  The backend already has an API‑Key mechanism for
service‑to‑service calls; this file adds a proper user‑account flow.
"""

from datetime import datetime, timedelta
import uuid

import jwt
from passlib.context import CryptContext

from app.config import settings

# ---------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    """Return a bcrypt hash for *plain* password."""
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    """Verify *plain* against a stored *hashed* password."""
    return pwd_context.verify(plain, hashed)

# ---------------------------------------------------------------------
# JWT handling – short‑lived access token (default 1 hour)
# ---------------------------------------------------------------------
def create_access_token(email: str, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT containing the user's e‑mail.

    The token payload includes ``sub`` (subject) and ``exp`` (expiration).
    ``settings.jwt_secret`` is used as the signing key.
    """
    to_encode = {"sub": email}
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=1))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")

def decode_access_token(token: str) -> str | None:
    """Decode *token* and return the e‑mail if valid, otherwise ``None``.
    ``jwt`` will raise ``ExpiredSignatureError`` or ``InvalidTokenError`` –
    we catch them and return ``None`` so the caller can raise a proper
    ``HTTPException``.
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        return None
