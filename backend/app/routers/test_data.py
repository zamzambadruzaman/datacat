"""Test data endpoint for multi-tenant demo.

This endpoint creates sample teams, members, domains, and assets
to demonstrate the multi-tenant data catalog workflow.
"""

import uuid
from datetime import datetime, timezone
import duckdb
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
# Test data endpoint is optional; we keep it protected by API key for demo purposes.

router = APIRouter(prefix="/api/test", tags=["test"])


@router.post("/seed-data", status_code=201)
def seed_test_data(db: duckdb.DuckDBPyConnection = Depends(get_db)):
    """Create sample teams, members, domains, and assets."""
    try:
        # Clear existing data (for demo purposes)
        db.execute("DELETE FROM access_requests")
        db.execute("DELETE FROM assets")
        db.execute("DELETE FROM domains")
        db.execute("DELETE FROM team_members")
        db.execute("DELETE FROM teams")
        
        now = datetime.now(timezone.utc)
        
        # Team 1: Marketing
        team1_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO teams (id, name, description) VALUES (?, ?, ?)",
            [team1_id, "Marketing", "Marketing data products and analytics"],
        )
        db.execute(
            "INSERT INTO team_members (id, team_id, email, role) VALUES (?, ?, ?, ?)",
            [str(uuid.uuid4()), team1_id, "marketing-lead@company.com", "owner"],
        )
        db.execute(
            "INSERT INTO team_members (id, team_id, email, role) VALUES (?, ?, ?, ?)",
            [str(uuid.uuid4()), team1_id, "marketing-analyst@company.com", "member"],
        )
        
        # Team 2: Finance
        team2_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO teams (id, name, description) VALUES (?, ?, ?)",
            [team2_id, "Finance", "Financial data and reporting"],
        )
        db.execute(
            "INSERT INTO team_members (id, team_id, email, role) VALUES (?, ?, ?, ?)",
            [str(uuid.uuid4()), team2_id, "finance-lead@company.com", "owner"],
        )
        
        # Domains
        domain1_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO domains (id, name, description, owner_email, team_id, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [domain1_id, "Customer Analytics", "Customer behavior and segmentation", "marketing-lead@company.com", team1_id, now, now],
        )
        
        domain2_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO domains (id, name, description, owner_email, team_id, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [domain2_id, "Revenue", "Revenue and transaction data", "finance-lead@company.com", team2_id, now, now],
        )
        
        # Assets
        # Published asset 1
        asset1_id = str(uuid.uuid4())
        schema1 = '{"customer_id":"INT","email":"STRING","lifetime_value":"DECIMAL","segment":"STRING"}'
        db.execute(
            "INSERT INTO assets ("
            "id, domain_id, name, description, source_type, connection_uri, schema_json, "
            "owner_email, tags, quality_score, freshness, published, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                asset1_id, domain1_id, "Customer Segments", 
                "Segmented customer data for targeting campaigns",
                "bigquery", "project.dataset.customer_segments",
                schema1,
                "marketing-lead@company.com", "customer,segments,audience", 0.95, "daily", True, now, now,
            ],
        )
        
        # Unpublished asset (private)
        asset2_id = str(uuid.uuid4())
        schema2 = '{"customer_id":"INT","event_type":"STRING","timestamp":"TIMESTAMP","value":"DECIMAL"}'
        db.execute(
            "INSERT INTO assets ("
            "id, domain_id, name, description, source_type, connection_uri, schema_json, "
            "owner_email, tags, quality_score, freshness, published, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                asset2_id, domain1_id, "Raw Events (Internal)",
                "Unprocessed customer events - internal use only",
                "bigquery", "project.dataset.raw_events",
                schema2,
                "marketing-analyst@company.com", "raw,internal", 0.80, "real-time", False, now, now,
            ],
        )
        
        # Published asset 2
        asset3_id = str(uuid.uuid4())
        schema3 = '{"transaction_id":"STRING","date":"DATE","amount":"DECIMAL","currency":"STRING","category":"STRING"}'
        db.execute(
            "INSERT INTO assets ("
            "id, domain_id, name, description, source_type, connection_uri, schema_json, "
            "owner_email, tags, quality_score, freshness, published, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                asset3_id, domain2_id, "Revenue Transactions",
                "All completed transactions with revenue impact",
                "snowflake", "db.schema.transactions",
                schema3,
                "finance-lead@company.com", "revenue,transactions,financial", 0.98, "hourly", True, now, now,
            ],
        )
        
        return {
            "status": "success",
            "teams": [
                {"id": team1_id, "name": "Marketing"},
                {"id": team2_id, "name": "Finance"},
            ],
            "domains": [
                {"id": domain1_id, "name": "Customer Analytics", "team_id": team1_id},
                {"id": domain2_id, "name": "Revenue", "team_id": team2_id},
            ],
            "assets": [
                {"id": asset1_id, "name": "Customer Segments", "published": True},
                {"id": asset2_id, "name": "Raw Events (Internal)", "published": False},
                {"id": asset3_id, "name": "Revenue Transactions", "published": True},
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed data: {str(e)}")
