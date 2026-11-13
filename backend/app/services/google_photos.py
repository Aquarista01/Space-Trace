import httpx
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User

fernet = Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())

PICKER_BASE = "https://photospicker.googleapis.com/v1"
TOKEN_URL = "https://oauth2.googleapis.com/token"


def get_access_token(db: Session, user_id) -> str:
    user = db.get(User, user_id)
    if user is None or not user.google_refresh_token_enc:
        raise ValueError("Google Photos access not granted yet")

    refresh_token = fernet.decrypt(user.google_refresh_token_enc.encode()).decode()
    resp = httpx.post(
        TOKEN_URL,
        data={
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def create_picker_session(access_token: str) -> dict:
    resp = httpx.post(
        f"{PICKER_BASE}/sessions",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    resp.raise_for_status()
    return resp.json()


def get_picker_session(access_token: str, session_id: str) -> dict:
    resp = httpx.get(
        f"{PICKER_BASE}/sessions/{session_id}",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    resp.raise_for_status()
    return resp.json()


def list_picked_media_items(access_token: str, session_id: str) -> list[dict]:
    items = []
    page_token = None
    while True:
        params = {"sessionId": session_id, "pageSize": 100}
        if page_token:
            params["pageToken"] = page_token
        resp = httpx.get(
            f"{PICKER_BASE}/mediaItems",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()
        items.extend(data.get("mediaItems", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return items


def download_media_bytes(access_token: str, base_url: str) -> bytes:
    resp = httpx.get(
        f"{base_url}=d",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    resp.raise_for_status()
    return resp.content

def revoke_connection(user) -> None:
    if not user.google_refresh_token_enc:
        return
    try:
        refresh_token = fernet.decrypt(user.google_refresh_token_enc.encode()).decode()
        httpx.post("https://oauth2.googleapis.com/revoke", params={"token": refresh_token}, timeout=10)
    except Exception:
        pass