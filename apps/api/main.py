from fastapi import FastAPI, Request, HTTPException as FastAPIHTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from starlette.middleware.base import BaseHTTPMiddleware

from core.logging import configure_logging, add_request_logging_middleware, get_request_id
from core.config import get_settings

from routers.health import router as health_router
from routers.matches import router as matches_router
from routers.events import router as events_router
from routers.summary import router as summary_router
from routers.players import router as players_router
from routers.competitions import router as competitions_router
from routers.auth import router as auth_router
from routers.workspaces import router as workspaces_router
from routers.invitations import router as invitations_router
from routers.analyses import router as analyses_router

from schemas.error import ErrorResponse, ErrorCode


configure_logging()

import logging
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Soccer Analytics API",
    description="Professional soccer data analysis platform for coaches and fans",
    version="0.3.0"
)


# --- Security Headers Middleware (lightweight, applied to all responses) ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds standard security headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


app.add_middleware(SecurityHeadersMiddleware)

# CORS - now driven from centralized settings
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(matches_router)
app.include_router(events_router)
app.include_router(summary_router)
app.include_router(players_router)
app.include_router(competitions_router)
app.include_router(auth_router)
app.include_router(invitations_router)
app.include_router(workspaces_router)
app.include_router(analyses_router)

# Add request logging middleware (after routers are included is fine)
add_request_logging_middleware(app)


@app.get("/")
def root():
    return {"message": "Soccer Analytics API"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    rid = getattr(request.state, "request_id", None)
    logger.exception(f"Unhandled exception at {request.url} (request_id={rid})")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            detail="An unexpected error occurred. Please try again later.",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
            request_id=rid,
        ).dict(),
        headers={"X-Request-ID": rid} if rid else None,
    )


@app.exception_handler(FastAPIHTTPException)
async def http_exception_handler(request: Request, exc: FastAPIHTTPException):
    """Ensure all HTTPException responses use the consistent ErrorResponse shape + request ID."""
    rid = getattr(request.state, "request_id", None)

    if isinstance(exc.detail, dict):
        content = exc.detail
    else:
        content = ErrorResponse(detail=str(exc.detail), request_id=rid).dict()

    # Merge any existing exc.headers with our request ID header
    headers = dict(exc.headers or {})
    if rid:
        headers["X-Request-ID"] = rid

    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=headers or None,
    )