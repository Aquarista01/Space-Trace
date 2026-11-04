import hashlib
import uuid
from datetime import datetime
from io import BytesIO

from PIL import Image
from sqlalchemy.orm import Session

from app.models.source_media import SourceMedia
from app.services import storage


def parse_create_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def save_media(
    db: Session,
    user_id: uuid.UUID,
    content: bytes,
    mime_type: str,
    captured_at: datetime | None = None,
    google_item_id: str | None = None,
) -> tuple[SourceMedia, bool]:
    content_hash = hashlib.sha256(content).hexdigest()

    existing = (
        db.query(SourceMedia)
        .filter_by(user_id=user_id, content_hash=content_hash)
        .first()
    )
    if existing is not None:
        return existing, False

    extension = mime_type.split("/")[-1]
    key = f"users/{user_id}/media/{uuid.uuid4()}.{extension}"

    width = height = None
    if mime_type.startswith("image/"):
        try:
            image = Image.open(BytesIO(content))
            width, height = image.size
        except Exception:
            pass

    storage.upload_bytes(key, content, mime_type)

    media = SourceMedia(
        user_id=user_id,
        google_item_id=google_item_id,
        content_hash=content_hash,
        minio_key=key,
        mime_type=mime_type,
        width=width,
        height=height,
        taken_at=captured_at,
        index_status="pending",
    )
    db.add(media)
    db.flush()
    return media, True