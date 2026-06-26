from pydantic import BaseModel, Field


class PassNetworkNode(BaseModel):
    player: str
    player_id: int | None = None
    passes_made: int = 0
    passes_received: int = 0
    avg_x: float = 0
    avg_y: float = 0


class PassNetworkEdge(BaseModel):
    passer: str
    recipient: str
    count: int = 0
    progressive_count: int = 0


class MatchPassNetworkResponse(BaseModel):
    match_id: int
    team: str
    home_team: str
    away_team: str
    total_passes: int = 0
    completed_passes: int = 0
    progressive_passes: int = 0
    nodes: list[PassNetworkNode] = []
    edges: list[PassNetworkEdge] = []


class TeamProgressivePassSummary(BaseModel):
    team: str
    total_passes: int = 0
    completed_passes: int = 0
    progressive_passes: int = 0


class ProgressivePassLeaderboardResponse(BaseModel):
    competition: str
    season: str
    teams: list[TeamProgressivePassSummary] = Field(default_factory=list)