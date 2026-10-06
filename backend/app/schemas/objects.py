import uuid
from datetime import datetime

from pydantic import BaseModel

class LastSeenOut(BaseModel):
    observed_at: datetime | None
    space_id: uuid.UUID | None
    space_name: str | None
    media_id: uuid.UUID
    image_url: str
    confidence: float
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float


class ObservationOut(BaseModel):
    id: uuid.UUID
    observed_at: datetime | None
    space_id: uuid.UUID | None
    space_name: str | None
    media_id: uuid.UUID
    image_url: str
    confidence: float
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    


class ObjectListItemOut(BaseModel):
    id: uuid.UUID
    label: str
    display_name: str | None
    is_confirmed: bool
    last_seen: LastSeenOut | None



class ObjectUpdateIn(BaseModel):
    display_name: str | None = None
    is_confirmed: bool | None = None

class PendingMatchOut(BaseModel):
    id: uuid.UUID
    label: str
    display_name: str | None
    candidate_id: uuid.UUID
    candidate_label: str | None
    candidate_display_name: str | None
    score: float