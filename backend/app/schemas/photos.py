

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SourceMediaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mime_type: str
    width: int | None
    height: int | None
    taken_at: datetime | None
    index_status: str
    created_at: datetime


class SourceMediaUpdateIn(BaseModel):
    taken_at: datetime | None = None

    
class PickerSessionOut(BaseModel):
    id: uuid.UUID
    picker_uri: str
    status: str

    class Config:
        from_attributes = True


class IndexJobOut(BaseModel):
    id: uuid.UUID
    total: int
    processed: int
    failed: int
    status: str

    class Config:
        from_attributes = True