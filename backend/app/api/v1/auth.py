import secrets

import httpx
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import COOKIE_NAME
from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.services import google_auth

router = APIRouter(prefix="/auth", tags=["Auth"])

STATE_COOKIE = "oauth_state"

fernet = Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())


@router.get(
    "/google/login",
    summary="Start Google sign-in",
    description=(
        "Redirects the browser to Google's sign-in page. "
        "Open this URL directly in a browser; Swagger's 'Try it out' cannot follow the redirect."
    ),
)
def google_login():
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(500, "GOOGLE_CLIENT_ID is not configured")
    state = secrets.token_urlsafe(24)
    resp = RedirectResponse(google_auth.build_login_url(state))
    resp.set_cookie(
        STATE_COOKIE, state, max_age=600, httponly=True,
        samesite="lax", secure=settings.COOKIE_SECURE,
    )
    return resp


@router.get(
    "/google/callback",
    summary="Google OAuth callback",
    description=(
        "Called by Google after the user grants access. Creates or updates the user, "
        "sets the session cookie and redirects to the frontend dashboard."
    ),
)
def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    if error or not code:
        return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/login?error=google_denied")
    if not state or state != request.cookies.get(STATE_COOKIE):
        raise HTTPException(400, "OAuth state mismatch")

    try:
        tokens = google_auth.exchange_code(code)
        info = google_auth.fetch_userinfo(tokens["access_token"])
    except httpx.HTTPError:
        raise HTTPException(502, "Google authentication failed")

    user = db.scalar(select(User).where(User.google_sub == info["sub"]))
    if user is None:
        user = User(google_sub=info["sub"], email=info["email"])
        db.add(user)
    user.name = info.get("name")
    user.avatar_url = info.get("picture")

    refresh_token = tokens.get("refresh_token")
    if refresh_token:
        user.google_refresh_token_enc = fernet.encrypt(refresh_token.encode()).decode()

    db.commit()

    resp = RedirectResponse(f"{settings.FRONTEND_ORIGIN}/dashboard")
    resp.set_cookie(
        COOKIE_NAME, create_access_token(str(user.id)),
        max_age=settings.JWT_EXPIRE_MINUTES * 60, httponly=True,
        samesite="lax", secure=settings.COOKIE_SECURE,
    )
    resp.delete_cookie(STATE_COOKIE)
    return resp


@router.post("/logout", summary="Sign out")
def logout():
    resp = JSONResponse({"detail": "Logged out"})
    resp.delete_cookie(
        COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
    )
    return resp