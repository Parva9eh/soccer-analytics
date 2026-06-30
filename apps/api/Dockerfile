FROM python:3.11-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./
# pyiceberg (via supabase→storage3) has manylinux wheels; building the sdist
# SIGSEGVs in python:3.11-slim during setuptools.
RUN uv sync --frozen --no-dev --no-build

COPY . .

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]