import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, LargeBinary, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ObjectEntity(Base):
    __tablename__ = "objects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(100))
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    canonical_embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    pending_match_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("objects.id", ondelete="SET NULL"), nullable=True
    )
    pending_match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)