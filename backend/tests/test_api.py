def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_create_domain_requires_api_key(client):
    r = client.post("/api/domains", json={"name": "finance"})
    assert r.status_code == 401


def test_domain_crud(client, api_headers):
    # Create a team so the caller has a team to own the domain
    r = client.post("/api/teams", json={"name": "finance-team"}, headers=api_headers)
    assert r.status_code == 201
    team_id = r.json()["id"]

    # Create
    r = client.post(
        "/api/domains",
        json={"name": "finance", "owner_email": "team@example.com", "team_id": team_id},
        headers=api_headers,
    )
    assert r.status_code == 201
    domain = r.json()
    assert domain["name"] == "finance"
    domain_id = domain["id"]

    # List
    r = client.get("/api/domains", headers=api_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1

    # Get requires authentication
    r = client.get(f"/api/domains/{domain_id}")
    assert r.status_code == 401

    # Get
    r = client.get(f"/api/domains/{domain_id}", headers=api_headers)
    assert r.status_code == 200
    assert r.json()["name"] == "finance"

    # Update
    r = client.put(f"/api/domains/{domain_id}", json={"description": "Finance domain"}, headers=api_headers)
    assert r.status_code == 200
    assert r.json()["description"] == "Finance domain"

    # Delete
    r = client.delete(f"/api/domains/{domain_id}", headers=api_headers)
    assert r.status_code == 204


def test_team_members_require_auth(client, api_headers):
    r = client.post("/api/teams", json={"name": "ops-team"}, headers=api_headers)
    assert r.status_code == 201
    team_id = r.json()["id"]

    # Unauthenticated
    r = client.get(f"/api/teams/{team_id}/members")
    assert r.status_code == 401

    # Authenticated (creator is an owner/member of the team)
    r = client.get(f"/api/teams/{team_id}/members", headers=api_headers)
    assert r.status_code == 200


def test_asset_crud(client, api_headers):
    # Create domain first
    r = client.post("/api/domains", json={"name": "logistics"}, headers=api_headers)
    domain_id = r.json()["id"]

    # Create asset
    r = client.post(
        "/api/assets",
        json={
            "domain_id": domain_id,
            "name": "shipments_fact",
            "source_type": "snowflake",
            "description": "Daily shipments fact table",
        },
        headers=api_headers,
    )
    assert r.status_code == 201
    asset = r.json()
    assert asset["name"] == "shipments_fact"
    asset_id = asset["id"]

    # List with search
    r = client.get("/api/assets?q=shipments")
    assert r.status_code == 200
    assert any(a["id"] == asset_id for a in r.json())

    # Get
    r = client.get(f"/api/assets/{asset_id}")
    assert r.status_code == 200

    # Update
    r = client.put(f"/api/assets/{asset_id}", json={"tags": "pii,finance"}, headers=api_headers)
    assert r.status_code == 200
    assert r.json()["tags"] == "pii,finance"

    # Delete
    r = client.delete(f"/api/assets/{asset_id}", headers=api_headers)
    assert r.status_code == 204


def test_asset_requires_valid_domain(client, api_headers):
    r = client.post(
        "/api/assets",
        json={"domain_id": "nonexistent", "name": "bad_asset"},
        headers=api_headers,
    )
    assert r.status_code == 400
