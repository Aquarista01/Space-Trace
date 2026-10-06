import uuid

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DiffItem(Base):
    __tablename__ = "diff_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    diff_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("diff_results.id", ondelete="CASCADE"), index=True)
    object_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("objects.id", ondelete="SET NULL"), nullable=True)
    change_type: Mapped[str] = mapped_column(String(20))
    observation_a_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("observations.id", ondelete="SET NULL"), nullable=True)
    observation_b_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("observations.id", ondelete="SET NULL"), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)