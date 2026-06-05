from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class WorkspaceRole(str, Enum):
    admin = "admin"
    coach = "coach"
    analyst = "analyst"
    viewer = "viewer"


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class WorkspaceMemberResponse(BaseModel):
    user_id: UUID
    role: WorkspaceRole
    display_name: Optional[str] = None
    email: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    role: WorkspaceRole
    member_count: int = 0


class WorkspaceDetailResponse(WorkspaceResponse):
    members: list[WorkspaceMemberResponse] = []