from uuid import UUID

from pydantic import BaseModel


class AuthMeResponse(BaseModel):
    id: str
    email: str | None = None
    role: str = "authenticated"
    display_name: str | None = None
    active_workspace_id: UUID | None = None
    active_workspace_name: str | None = None


class AuthMeUpdate(BaseModel):
    active_workspace_id: UUID | None = None