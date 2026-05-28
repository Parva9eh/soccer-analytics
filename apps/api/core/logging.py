import json
import logging
import os
import sys
import uuid
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    """Formatter that outputs log records as JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }
        # Include request_id (and any other extras we log via `extra=`) as top-level fields
        if hasattr(record, "request_id") and record.request_id:
            log_record["request_id"] = record.request_id

        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(log_record)


def configure_logging() -> None:
    """Configure root logging for the application.

    Respects the following environment variables:
    - LOG_LEVEL: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL). Default: INFO
    - LOG_FORMAT: Output format. "text" (default) or "json".
    """
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_format = os.getenv("LOG_FORMAT", "text").lower()

    handler = logging.StreamHandler(sys.stdout)

    if log_format == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
        )

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level, logging.INFO))

    # Remove any existing handlers to avoid duplicate logs
    root_logger.handlers = []
    root_logger.addHandler(handler)


# --- Request Logging Middleware ---

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import time


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs every request and injects a stable X-Request-ID for tracing."""

    # Paths that should not generate request logs (to avoid noise from health checks, docs, etc.)
    # Can be overridden via the LOG_EXCLUDED_PATHS environment variable (comma-separated).
    DEFAULT_EXCLUDED_PATHS = {"/health", "/docs", "/redoc", "/openapi.json", "/favicon.ico"}

    @classmethod
    def get_excluded_paths(cls):
        env_value = os.getenv("LOG_EXCLUDED_PATHS")
        if env_value:
            return {p.strip() for p in env_value.split(",") if p.strip()}
        return cls.DEFAULT_EXCLUDED_PATHS

    @staticmethod
    def _path_matches(path: str, patterns: set) -> bool:
        """Check if path matches any pattern (supports trailing * for prefix matching)."""
        for pattern in patterns:
            if pattern.endswith("*"):
                if path.startswith(pattern[:-1]):
                    return True
            elif path == pattern or path.startswith(pattern.rstrip("/") + "/"):
                return True
        return False

    async def dispatch(self, request: Request, call_next):
        # Request ID first (always) — respect incoming header from clients/proxies
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id

        path = request.url.path
        excluded_paths = self.get_excluded_paths()

        # Skip logging for excluded paths (e.g. health checks, docs) but still set the header
        if self._path_matches(path, excluded_paths):
            response: Response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response

        start_time = time.time()
        response: Response = await call_next(request)
        duration = time.time() - start_time

        # Resolve real client IP (works behind common reverse proxies)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "-")

        user_agent = request.headers.get("user-agent", "-")

        logger = logging.getLogger("request")
        logger.info(
            f"{request.method} {path} "
            f"status={response.status_code} duration={duration:.3f}s "
            f"ip={client_ip} "
            f'ua="{user_agent}"',
            extra={"request_id": request_id}
        )
        response.headers["X-Request-ID"] = request_id
        return response


def add_request_logging_middleware(app):
    """Attach request logging middleware to a FastAPI app."""
    app.add_middleware(RequestLoggingMiddleware)


def get_request_id(request: Request) -> str:
    """FastAPI dependency. Returns the current request's ID (or '-' if missing)."""
    return getattr(request.state, "request_id", "-")
