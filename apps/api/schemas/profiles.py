from pydantic import BaseModel


class PlayerSeasonProfile(BaseModel):
    player_id: int
    player_name: str
    competition: str
    season: str
    team: str | None = None
    matches_with_events: int = 0
    shots: int = 0
    goals: int = 0
    xg: float = 0
    passes: int = 0
    completed_passes: int = 0
    progressive_passes: int = 0


class TeamSeasonProfile(BaseModel):
    team: str
    competition: str
    season: str
    matches: int = 0
    goals_for: int = 0
    goals_against: int = 0
    xg_for: float = 0
    xg_against: float = 0
    passes: int = 0
    completed_passes: int = 0
    progressive_passes: int = 0
    avg_passes_per_possession: float = 0
    shot_possession_rate: float = 0


class ComparePlayersResponse(BaseModel):
    competition: str
    season: str
    player_a: PlayerSeasonProfile
    player_b: PlayerSeasonProfile


class CompareTeamsResponse(BaseModel):
    competition: str
    season: str
    team_a: TeamSeasonProfile
    team_b: TeamSeasonProfile