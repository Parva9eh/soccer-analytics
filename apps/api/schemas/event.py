from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class EventResponse(BaseModel):
    id: int
    match_id: int
    event_type: Optional[str] = None
    minute: Optional[int] = None
    second: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None
    end_x: Optional[float] = None
    end_y: Optional[float] = None
    details: Optional[Any] = None   # Full raw StatsBomb event

    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    events: list[EventResponse]