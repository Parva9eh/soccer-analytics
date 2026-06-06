from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

import re

from pydantic import BaseModel, Field, field_validator

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


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


class InvitationStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    revoked = "revoked"


class InvitationCreate(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    role: WorkspaceRole = WorkspaceRole.viewer

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not _EMAIL_RE.match(normalized):
            raise ValueError("Invalid email address")
        return normalized

    @field_validator("role")
    @classmethod
    def role_not_admin(cls, role: WorkspaceRole) -> WorkspaceRole:
        if role == WorkspaceRole.admin:
            raise ValueError("Invitations cannot grant admin role")
        return role


class InvitationResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    email: str
    role: WorkspaceRole
    status: InvitationStatus
    created_at: datetime
    expires_at: datetime
    invite_url: str | None = None


class InvitationAccept(BaseModel):
    token: str = Field(..., min_length=8, max_length=128)


class InvitationAcceptResponse(BaseModel):
    workspace_id: UUID
    workspace_name: str
    role: WorkspaceRole


class WorkspaceDatasetCreate(BaseModel):
    competition: str = Field(..., min_length=1, max_length=120)
    season: str = Field(..., min_length=1, max_length=32)


class WorkspaceDatasetResponse(BaseModel):
    competition_id: int
    season_id: int
    competition: str
    season: str
    added_at: datetime