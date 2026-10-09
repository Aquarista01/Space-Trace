from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    DATABASE_URL: str

    JWT_SECRET: str
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7
    TOKEN_ENCRYPTION_KEY: str

    FRONTEND_ORIGIN: str
    COOKIE_SECURE: bool = False

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""

    S3_ENDPOINT: str = ""
    S3_PUBLIC_ENDPOINT: str | None = None
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_BUCKET: str = "spacetrace-media"
    S3_REGION: str = "us-east-1"


settings = Settings()