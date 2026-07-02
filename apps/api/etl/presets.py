from dataclasses import dataclass
from typing import Literal


DatasetRole = Literal["guest_demo", "expansion"]


@dataclass(frozen=True)
class StatsBombDataset:
    competition: str
    season: str
    gender: str = "male"
    role: DatasetRole = "expansion"
    description: str = ""


# Curated loads for Soccer Analytics — all from StatsBomb open data.
RECOMMENDED_DATASETS: tuple[StatsBombDataset, ...] = (
    StatsBombDataset(
        competition="La Liga",
        season="2020/2021",
        role="guest_demo",
        description="Default guest demo dataset (Spain, 2020/21).",
    ),
    StatsBombDataset(
        competition="Premier League",
        season="2003/2004",
        role="expansion",
        description="Second league season for multi-competition workspaces (England, Invincibles era).",
    ),
)

GUEST_DEMO_DATASET = RECOMMENDED_DATASETS[0]
EXPANSION_DATASET = RECOMMENDED_DATASETS[1]