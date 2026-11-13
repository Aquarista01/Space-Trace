from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.services.storage import get_s3

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", summary="Check API, database and object storage status")
def health(db: Session = Depends(get_db)):
    result = {"api": "ok", "database": "error", "storage": "error"}
    try:
        db.execute(text("SELECT 1"))
        result["database"] = "ok"
    except Exception:
        pass
    try:
        result["storage"] = "ok" if get_s3().bucket_exists(settings.S3_BUCKET) else "bucket_missing"
    except Exception:
        pass
    return result