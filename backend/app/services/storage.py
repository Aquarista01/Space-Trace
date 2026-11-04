from datetime import timedelta
from functools import lru_cache
from io import BytesIO
from urllib.parse import urlparse

from minio import Minio

from app.core.config import settings

_bucket_ready = False


def _build_client(endpoint_url: str) -> Minio:
    parsed = urlparse(endpoint_url)
    return Minio(
        parsed.netloc,                      # "localhost:8333", không có http://
        access_key=settings.S3_ACCESS_KEY,
        secret_key=settings.S3_SECRET_KEY,
        secure=parsed.scheme == "https",
        region=settings.S3_REGION,          # tránh SDK gọi mạng để dò region
    )


@lru_cache
def get_s3() -> Minio:
    """Client dùng nội bộ (backend -> SeaweedFS)."""
    return _build_client(settings.S3_ENDPOINT)


@lru_cache
def _get_public_s3() -> Minio:
    """Client chỉ dùng để ký presigned URL với host mà trình duyệt truy cập được."""
    return _build_client(settings.S3_PUBLIC_ENDPOINT or settings.S3_ENDPOINT)


def ensure_bucket() -> None:
    global _bucket_ready
    if _bucket_ready:
        return
    client = get_s3()
    if not client.bucket_exists(settings.S3_BUCKET):
        client.make_bucket(settings.S3_BUCKET)
    _bucket_ready = True


def upload_bytes(key: str, data: bytes, content_type: str) -> None:
    ensure_bucket()
    get_s3().put_object(
        settings.S3_BUCKET,
        key,
        BytesIO(data),
        length=len(data),
        content_type=content_type,
    )


def get_presigned_url(key: str, expires_seconds: int = 900) -> str:
    return _get_public_s3().presigned_get_object(
        settings.S3_BUCKET,
        key,
        expires=timedelta(seconds=expires_seconds),
    )


def delete_object(key: str) -> None:
    get_s3().remove_object(settings.S3_BUCKET, key)