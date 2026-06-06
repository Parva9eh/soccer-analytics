from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SavedAnalysisConfig(BaseModel):
    version: int = 1
    selected_event_type: str = "all"
    visible_event_types: list[str] = Field(default_factory=list)
    use_3d_view: bool = False
    current_3d_view: str = "iso"

    model_config = {"extra": "ignore"}


class SavedAnalysisCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    notes: Optional[str] = Field(None, max_length=2000)
    match_id: Optional[int] = None
    config: SavedAnalysisConfig = Field(default_factory=SavedAnalysisConfig)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Title is required")
        return trimmed


class SavedAnalysisUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    notes: Optional[str] = Field(None, max_length=2000)
    config: Optional[SavedAnalysisConfig] = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Title cannot be empty")
        return trimmed


class SavedAnalysisResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    match_id: Optional[int] = None
    title: str
    notes: Optional[str] = None
    config: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    match_label: Optional[str] = None