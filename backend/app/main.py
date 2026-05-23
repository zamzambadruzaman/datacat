import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import get_connection
from app.routers import assets, domains, health, access_requests, team, team_members, test_data, auth

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger("datacat")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("datacat starting — initialising database")
    get_connection()
    yield
    logger.info("datacat shutting down")


app = FastAPI(
    title="datacat",
    description="Lightweight data catalog with Data Mesh principles",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(domains.router)
app.include_router(assets.router)
app.include_router(access_requests.router)
app.include_router(team.router)
app.include_router(team_members.router)
if settings.enable_test_data_endpoint:
    app.include_router(test_data.router)
app.include_router(auth.router)
