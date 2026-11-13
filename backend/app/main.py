import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.timing import TimingMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.services.storage import ensure_bucket
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
logger = logging.getLogger("spacetrace")




@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_bucket()
    except Exception as exc:
        logger.warning("MinIO unavailable at startup, continuing without it: %s", exc)
    yield


app = FastAPI(
    title="SpaceTrace API",
    description="REST API for SpaceTrace: track the history of objects and spaces from photos.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TimingMiddleware)
app.include_router(api_router)