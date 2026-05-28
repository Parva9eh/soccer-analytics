from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from core.logging import configure_logging, add_request_logging_middleware
from routers.health import router as health_router
from routers.matches import router as matches_router
from routers.events import router as events_router
from routers.summary import router as summary_router


configure_logging()

import logging
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Soccer Analytics API",
    description="Professional soccer data analysis platform for coaches and fans",
    version="0.3.0"
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
app.include_router(summary_router)   # ← New

# Add request logging middleware (after routers are included is fine)
add_request_logging_middleware(app)


@app.get("/")
def root():
    return {"message": "Soccer Analytics API"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception at {request.url}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )