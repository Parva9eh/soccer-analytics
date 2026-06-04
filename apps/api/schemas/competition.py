from pydantic import BaseModel


class CompetitionCatalogItem(BaseModel):
    name: str
    seasons: list[str]