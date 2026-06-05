from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class MatchResponse(BaseModel):
    id: int
    match_date: datetime
    home_team: Optional[str] = None
    away_team: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    competition: Optional[str] = None
    season: Optional[str] = None
    match_week: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)