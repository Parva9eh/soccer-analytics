from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.health import router as health_router
from routers.matches import router as matches_router
from routers.events import router as events_router

app = FastAPI(
    title="Soccer Analytics API",
    description="Professional soccer data analysis platform",
    version="0.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(matches_router)
app.include_router(events_router)

@app.get("/")
def root():
    return {"message": "Soccer Analytics API is running"}