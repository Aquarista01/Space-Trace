from fastapi import APIRouter

from app.api.v1 import auth, health, photos, users, objects, spaces

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(photos.router)
api_router.include_router(objects.router)
api_router.include_router(spaces.router)