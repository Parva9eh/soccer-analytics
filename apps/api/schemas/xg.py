from pydantic import BaseModel, Field


class TeamXgSummary(BaseModel):
    team: str
    shots: int = 0
    goals: int = 0
    xg: float = 0


class PlayerXgSummary(BaseModel):
    player: str
    team: str | None = None
    shots: int = 0
    goals: int = 0
    xg: float = 0


class MatchXgResponse(BaseModel):
    match_id: int
    home_team: str
    away_team: str
    home: TeamXgSummary
    away: TeamXgSummary


class SeasonXgResponse(BaseModel):
    competition: str
    season: str
    matches: int = 0
    total_shots: int = 0
    total_goals: int = 0
    total_xg: float = 0
    avg_xg_per_match: float = 0


class PlayerXgLeaderboardResponse(BaseModel):
    competition: str
    season: str
    players: list[PlayerXgSummary] = []


class TeamXgLeaderboardResponse(BaseModel):
    competition: str
    season: str
    teams: list[TeamXgSummary] = []


class MatchXgFormPoint(BaseModel):
    match_id: int
    match_week: int | None = None
    match_date: str | None = None
    opponent: str
    is_home: bool
    xg_for: float = 0
    xg_against: float = 0
    goals_for: int | None = None
    goals_against: int | None = None
    rolling_xg_for: float = 0
    rolling_xg_against: float = 0


class TeamXgFormResponse(BaseModel):
    competition: str
    season: str
    team: str
    window: int = Field(ge=1, le=15)
    points: list[MatchXgFormPoint] = []