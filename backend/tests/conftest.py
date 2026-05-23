import os
import pytest
from fastapi.testclient import TestClient

# Use in-memory DuckDB for tests
os.environ["DB_PATH"] = ":memory:"
os.environ["API_KEY"] = "test-key"

import app.database as database  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_db():
    """Reset the DuckDB connection between tests for isolation."""
    database._connection = None
    yield
    database._connection = None


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def api_headers():
    return {"X-API-KEY": "test-key"}
