from urllib.parse import urlencode

import httpx

from app.core.config import settings

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

LOGIN_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
]


def build_login_url(state: str) -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(LOGIN_SCOPES),
        "state": state,
        "access_type": "offline",
        "prompt": "consent select_account",
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def exchange_code(code: str) -> dict:
    resp = httpx.post(
        TOKEN_URL,
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_userinfo(access_token: str) -> dict:
    resp = httpx.get(
        USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}, timeout=15
    )
    resp.raise_for_status()
    return resp.json()