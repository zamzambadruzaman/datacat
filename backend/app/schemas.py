from datetime import datetime

from pydantic import BaseModel, Field


# ── User ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)


class UserTeamMembership(BaseModel):
    team_id: str
    team_name: str
    role: str


class UserOut(BaseModel):
    id: str
    email: str
    is_superadmin: bool = False
    teams: list[UserTeamMembership] = []
    created_at: datetime


class UserTeamAssign(BaseModel):
    team_id: str
    role: str = "member"  # "manager" or "member"


# ── Domain ──────────────────────────────────────────────────────────────────

class DomainCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str = ""
    team_id: str = ""


class DomainUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class DomainOut(BaseModel):
    id: str
    name: str
    description: str
    team_id: str
    created_at: datetime
    updated_at: datetime

# ── Team ───────────────────────────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str = ""

class TeamUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class TeamOut(BaseModel):
    id: str
    name: str
    description: str
    is_platform: bool = False

# ── Team Member ────────────────────────────────────────────────────────────

class TeamMemberCreate(BaseModel):
    email: str
    role: str = "member"  # "manager" or "member"


class TeamMemberUpdate(BaseModel):
    role: str  # "manager" or "member"


class TeamMemberOut(BaseModel):
    id: str
    team_id: str
    email: str
    role: str


# ── Asset ───────────────────────────────────────────────────────────────────

SOURCE_TYPES = {"snowflake", "bigquery", "redshift", "synapse", "postgres", "s3", "gcs"}


class AssetCreate(BaseModel):
    domain_id: str
    name: str = Field(..., min_length=1, max_length=256)
    description: str = ""
    source_type: str = ""
    connection_uri: str = ""
    schema_json: str = "{}"
    owner_email: str = ""
    tags: str = ""
    quality_score: float | None = None
    freshness: str = ""


class AssetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    source_type: str | None = None
    connection_uri: str | None = None
    schema_json: str | None = None
    owner_email: str | None = None
    tags: str | None = None
    quality_score: float | None = None
    freshness: str | None = None


class AssetOut(BaseModel):
    id: str
    domain_id: str
    name: str
    description: str
    source_type: str
    connection_uri: str
    schema_json: str
    owner_email: str
    tags: str
    quality_score: float | None
    freshness: str
    published: bool = False
    created_at: datetime
    updated_at: datetime

# ── Access Request ────────────────────────────────────────────────────────

class AccessRequestCreate(BaseModel):
    asset_id: str
    requester_email: str
    message: str | None = None

class AccessRequestOut(BaseModel):
    id: str
    asset_id: str
    requester_email: str
    status: str
    created_at: datetime
    decision_at: datetime | None = None
