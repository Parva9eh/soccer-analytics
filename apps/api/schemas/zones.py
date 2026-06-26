from pydantic import BaseModel


class TeamZoneSummary(BaseModel):
    team: str
    left_third: int
    middle_third: int
    right_third: int
    total_events: int


class SeasonZonesResponse(BaseModel):
    competition: str
    season: str
    teams: list[TeamZoneSummary]


class HeatmapBinOut(BaseModel):
    col: int
    row: int
    count: int


class TeamHeatmapResponse(BaseModel):
    competition: str
    season: str
    team: str
    cols: int
    rows: int
    bins: list[HeatmapBinOut]
    total_events: int