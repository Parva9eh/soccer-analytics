from pydantic import BaseModel, Field
from typing import Optional


class PaginationParams(BaseModel):
    """Reusable pagination parameters for list endpoints."""

    page: int = Field(1, ge=1, description="Page number (1-based)")
    page_size: int = Field(100, ge=1, le=500, description="Number of items per page")

    @property
    def offset(self) -> int:
        """Calculate the SQL/Supabase offset for the current page."""
        return (self.page - 1) * self.page_size


class LimitParams(BaseModel):
    """Reusable limit parameter for list endpoints (used instead of pagination)."""

    limit: int = Field(50, ge=1, le=200, description="Maximum number of items to return")


class MatchListParams(LimitParams):
    """Combined params for the matches list endpoint (limit + common filters)."""

    competition: Optional[str] = Field(None, description="Filter by competition name")
    season: Optional[str] = Field(None, description="Filter by season year")
