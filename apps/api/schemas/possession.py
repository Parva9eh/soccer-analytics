from pydantic import BaseModel, Field


class PossessionChainSummary(BaseModel):
    possession_id: int
    team: str
    event_count: int = 0
    pass_count: int = 0
    duration_seconds: int = 0
    start_minute: int | None = None
    end_minute: int | None = None
    play_pattern: str | None = None
    ended_with_shot: bool = False
    ended_with_goal: bool = False
    event_ids: list[int] = Field(default_factory=list)


class MatchPossessionResponse(BaseModel):
    match_id: int
    home_team: str
    away_team: str
    team: str | None = None
    chains: list[PossessionChainSummary] = []


class TeamPossessionSummary(BaseModel):
    team: str
    possessions: int = 0
    avg_duration_seconds: float = 0
    avg_passes_per_possession: float = 0
    shot_possession_rate: float = 0


class SeasonPossessionResponse(BaseModel):
    competition: str
    season: str
    matches: int = 0
    teams: list[TeamPossessionSummary] = Field(default_factory=list)