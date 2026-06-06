from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ReportDatasetItem(BaseModel):
    competition: str
    season: str


class ReportEventTypeItem(BaseModel):
    event_type: str
    count: int


class ReportWeekItem(BaseModel):
    match_week: int
    count: int


class WorkspaceDashboardResponse(BaseModel):
    workspace_id: UUID | None = None
    competition: str | None = None
    season: str | None = None
    total_matches: int = 0
    total_events: int = 0
    total_goals: int = 0
    avg_goals_per_match: float = 0
    event_types: list[ReportEventTypeItem] = []
    matches_by_week: list[ReportWeekItem] = []
    datasets: list[ReportDatasetItem] = []


class WorkspaceReportCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    notes: Optional[str] = Field(None, max_length=2000)
    competition: Optional[str] = Field(None, max_length=120)
    season: Optional[str] = Field(None, max_length=32)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Title is required")
        return trimmed


class WorkspaceReportResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    title: str
    notes: Optional[str] = None
    competition: Optional[str] = None
    season: Optional[str] = None
    snapshot: WorkspaceDashboardResponse
    created_at: datetime
    updated_at: datetime


def parse_dashboard_snapshot(raw: dict[str, Any]) -> WorkspaceDashboardResponse:
    event_types = [
        ReportEventTypeItem(
            event_type=str(item.get("event_type") or "Unknown"),
            count=int(item.get("count") or 0),
        )
        for item in raw.get("event_types") or []
        if isinstance(item, dict)
    ]
    matches_by_week = [
        ReportWeekItem(
            match_week=int(item.get("match_week") or 0),
            count=int(item.get("count") or 0),
        )
        for item in raw.get("matches_by_week") or []
        if isinstance(item, dict)
    ]
    datasets = [
        ReportDatasetItem(
            competition=str(item.get("competition") or ""),
            season=str(item.get("season") or ""),
        )
        for item in raw.get("datasets") or []
        if isinstance(item, dict)
    ]
    workspace_id = raw.get("workspace_id")

    return WorkspaceDashboardResponse(
        workspace_id=UUID(str(workspace_id)) if workspace_id else None,
        competition=raw.get("competition"),
        season=raw.get("season"),
        total_matches=int(raw.get("total_matches") or 0),
        total_events=int(raw.get("total_events") or 0),
        total_goals=int(raw.get("total_goals") or 0),
        avg_goals_per_match=float(raw.get("avg_goals_per_match") or 0),
        event_types=event_types,
        matches_by_week=matches_by_week,
        datasets=datasets,
    )


def snapshot_to_csv(title: str, snapshot: WorkspaceDashboardResponse) -> str:
    lines = [
        "Soccer Analytics — Workspace Report",
        f"Title,{title}",
    ]
    if snapshot.competition:
        lines.append(f"Competition,{snapshot.competition}")
    if snapshot.season:
        lines.append(f"Season,{snapshot.season}")
    lines.extend(
        [
            "",
            "Summary",
            f"Total matches,{snapshot.total_matches}",
            f"Total events,{snapshot.total_events}",
            f"Total goals,{snapshot.total_goals}",
            f"Avg goals per match,{snapshot.avg_goals_per_match}",
            "",
            "Event types",
            "event_type,count",
        ]
    )
    for item in snapshot.event_types:
        lines.append(f"{item.event_type},{item.count}")
    lines.extend(["", "Matches by week", "match_week,count"])
    for item in snapshot.matches_by_week:
        lines.append(f"{item.match_week},{item.count}")
    if snapshot.datasets:
        lines.extend(["", "Linked datasets", "competition,season"])
        for item in snapshot.datasets:
            lines.append(f"{item.competition},{item.season}")
    return "\n".join(lines) + "\n"