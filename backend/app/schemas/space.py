import uuid
from datetime import datetime

from pydantic import BaseModel


class SpaceOut(BaseModel):
    id: uuid.UUID
    name: str | None
    is_confirmed: bool
    scene_count: int
    cover_url: str | None
    last_updated: datetime | None
    recent_changes: int

    class Config:
        from_attributes = True


class SpaceUpdate(BaseModel):
    name: str | None = None
    is_confirmed: bool | None = None


class SceneOut(BaseModel):
    id: uuid.UUID
    taken_at: datetime | None
    media_url: str
    object_count: int

    class Config:
        from_attributes = True


class DiffCreate(BaseModel):
    space_id: uuid.UUID
    scene_a_id: uuid.UUID
    scene_b_id: uuid.UUID


class BBoxOut(BaseModel):
    x: float
    y: float
    w: float
    h: float


class DiffItemOut(BaseModel):
    object_id: uuid.UUID | None
    object_label: str | None
    change_type: str
    confidence: float
    bbox_a: BBoxOut | None = None
    bbox_b: BBoxOut | None = None
    nearest_label_a: str | None = None
    nearest_label_b: str | None = None

    class Config:
        from_attributes = True



class DiffResultOut(BaseModel):
    id: uuid.UUID
    scene_a_id: uuid.UUID
    scene_b_id: uuid.UUID
    scene_a_url: str
    scene_b_url: str
    items: list[DiffItemOut]

class MergeSpacesIn(BaseModel):
    source_id: uuid.UUID