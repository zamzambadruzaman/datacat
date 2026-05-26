from collections.abc import Generator

import duckdb

from app.config import settings

_connection: duckdb.DuckDBPyConnection | None = None


def _init_tables(conn: duckdb.DuckDBPyConnection) -> None:
    """Initialize all database tables in correct dependency order."""
    # Teams table first – represents a tenant/team that owns domains
    conn.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            id            VARCHAR PRIMARY KEY,
            name          VARCHAR NOT NULL,
            description   VARCHAR DEFAULT '',
            is_platform   BOOLEAN DEFAULT FALSE
        )
    """)
    
    # Team members table – tracks which users belong to which teams and their role
    conn.execute("""
        CREATE TABLE IF NOT EXISTS team_members (
            id      VARCHAR PRIMARY KEY,
            team_id VARCHAR NOT NULL REFERENCES teams(id),
            email   VARCHAR NOT NULL,
            role    VARCHAR NOT NULL DEFAULT 'member',
            UNIQUE (team_id, email)
        )
    """)
    
    # Domains table – business domains owned by teams
    conn.execute("""
        CREATE TABLE IF NOT EXISTS domains (
            id          VARCHAR PRIMARY KEY,
            name        VARCHAR UNIQUE NOT NULL,
            description VARCHAR DEFAULT '',
            owner_email VARCHAR DEFAULT '',
            team_id     VARCHAR NOT NULL REFERENCES teams(id),
            created_at  TIMESTAMP DEFAULT current_timestamp,
            updated_at  TIMESTAMP DEFAULT current_timestamp
        )
    """)
    
    # Assets table – data products published to domains
    conn.execute("""
        CREATE TABLE IF NOT EXISTS assets (
            id              VARCHAR PRIMARY KEY,
            domain_id       VARCHAR NOT NULL REFERENCES domains(id),
            name            VARCHAR NOT NULL,
            description     VARCHAR DEFAULT '',
            source_type     VARCHAR DEFAULT '',
            connection_uri  VARCHAR DEFAULT '',
            schema_json     VARCHAR DEFAULT '{}',
            owner_email     VARCHAR DEFAULT '',
            tags            VARCHAR DEFAULT '',
            quality_score   DOUBLE,
            freshness       VARCHAR DEFAULT '',
            published       BOOLEAN DEFAULT FALSE,
            created_at      TIMESTAMP DEFAULT current_timestamp,
            updated_at      TIMESTAMP DEFAULT current_timestamp
        )
    """)
    
    # Data layers table – configurable classification (landing, bronze, silver, gold, …)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS data_layers (
            id          VARCHAR PRIMARY KEY,
            name        VARCHAR UNIQUE NOT NULL,
            color       VARCHAR DEFAULT '#9CA3AF',
            position    INTEGER DEFAULT 0,
            created_at  TIMESTAMP DEFAULT current_timestamp
        )
    """)

    # Asset → layer classification (nullable). Migration for predating databases.
    asset_cols = [r[1] for r in conn.execute("PRAGMA table_info('assets')").fetchall()]
    if "layer_id" not in asset_cols:
        conn.execute("ALTER TABLE assets ADD COLUMN layer_id VARCHAR")

    # Access requests table – data consumer requests for asset access
    conn.execute("""
        CREATE TABLE IF NOT EXISTS access_requests (
            id            VARCHAR PRIMARY KEY,
            asset_id      VARCHAR NOT NULL REFERENCES assets(id),
            requester_email VARCHAR NOT NULL,
            status        VARCHAR DEFAULT 'pending',
            created_at    TIMESTAMP DEFAULT current_timestamp,
            decision_at   TIMESTAMP
        )
    """)

    # ---------------------------------------------------------------------
    # Users table – stores credentials for sign‑up / sign‑in
    # ---------------------------------------------------------------------
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id             VARCHAR PRIMARY KEY,
            email          VARCHAR NOT NULL UNIQUE,
            password       VARCHAR NOT NULL,
            is_superadmin  BOOLEAN DEFAULT FALSE,
            name           VARCHAR DEFAULT '',
            avatar         VARCHAR DEFAULT '',
            created_at     TIMESTAMP DEFAULT current_timestamp
        )
    """)
    # Migrations for databases that predate newer columns
    cols = [r[1] for r in conn.execute("PRAGMA table_info('users')").fetchall()]
    if "is_superadmin" not in cols:
        conn.execute("ALTER TABLE users ADD COLUMN is_superadmin BOOLEAN DEFAULT FALSE")
    if "name" not in cols:
        conn.execute("ALTER TABLE users ADD COLUMN name VARCHAR DEFAULT ''")
    if "avatar" not in cols:
        conn.execute("ALTER TABLE users ADD COLUMN avatar VARCHAR DEFAULT ''")


def get_connection() -> duckdb.DuckDBPyConnection:
    """Get or create the DuckDB connection."""
    global _connection
    if _connection is None:
        _connection = duckdb.connect(settings.db_path)
        _init_tables(_connection)
        _create_platform_team(_connection)
        _bootstrap_superadmin(_connection)
        _seed_data_layers(_connection)
    return _connection


def _seed_data_layers(conn: duckdb.DuckDBPyConnection) -> None:
    """Seed the default medallion layers if none exist yet."""
    import uuid
    existing = conn.execute("SELECT 1 FROM data_layers LIMIT 1").fetchone()
    if existing:
        return
    defaults = [
        ("landing", "#64748B", 0),
        ("bronze", "#B45309", 1),
        ("silver", "#9CA3AF", 2),
        ("gold", "#D97706", 3),
    ]
    for name, color, position in defaults:
        conn.execute(
            "INSERT INTO data_layers (id, name, color, position) VALUES (?, ?, ?, ?)",
            [str(uuid.uuid4()), name, color, position],
        )


def _create_platform_team(conn: duckdb.DuckDBPyConnection) -> None:
    """Create the platform team if it doesn't exist."""
    import uuid
    platform_team = conn.execute("SELECT id FROM teams WHERE is_platform = TRUE").fetchone()
    if not platform_team:
        platform_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO teams (id, name, description, is_platform) VALUES (?, ?, ?, ?)",
            [platform_id, "Platform", "Data Platform Team with global access", True],
        )


def _bootstrap_superadmin(conn: duckdb.DuckDBPyConnection) -> None:
    """If no superadmin exists yet, promote the earliest registered user."""
    has_superadmin = conn.execute(
        "SELECT 1 FROM users WHERE is_superadmin = TRUE LIMIT 1"
    ).fetchone()
    if has_superadmin:
        return
    first_user = conn.execute(
        "SELECT id FROM users ORDER BY created_at LIMIT 1"
    ).fetchone()
    if first_user:
        conn.execute(
            "UPDATE users SET is_superadmin = TRUE WHERE id = ?", [first_user[0]]
        )


def get_db() -> Generator[duckdb.DuckDBPyConnection, None, None]:
    """FastAPI dependency for getting database connection."""
    yield get_connection()
