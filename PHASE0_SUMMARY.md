# Phase 0: Housekeeping Summary

**Branch:** `phase0/housekeeping`  
**Status:** Complete  
**Date:** May 2026

## Purpose

Phase 0 was a focused housekeeping and monorepo hygiene phase. The goal was to clean up legacy code, fix configuration issues, establish proper monorepo tooling, and improve the developer experience before beginning the more substantial backend hardening work in Phase 1.

All changes were made incrementally with review at each step.

## Major Work Completed

### 1. Legacy Code Removal
- Removed the entire legacy `apps/web/src/` directory (old boilerplate pages, layout, and components).
- Deleted duplicate `button.jsx` file that existed in both `components/ui/` and the legacy `src/components/ui/`.
- Removed misplaced `apps/web/pnpm-workspace.yaml`.

### 2. Configuration Fixes
- Fixed `apps/web/components.json` (shadcn/ui config) to point to the correct paths (tsx: true, correct CSS location).
- Downgraded Python requirement in `apps/api/pyproject.toml` from `>=3.14` to `>=3.11` (3.14 was too bleeding-edge and caused compatibility issues).
- Added `apps/web/.env.example` for frontend environment variables.
- Scoped root `.gitignore` rules properly (`/lib/` instead of broad `lib/`) to protect `apps/web/lib/`.

### 3. Monorepo Tooling & Developer Experience
- Created root `package.json` with convenient monorepo scripts (`pnpm dev`, `pnpm dev:web`, `pnpm dev:api`, etc.).
- Introduced `apps/web/lib/api.ts` — centralized API client helper (`getApiUrl()`, `apiFetch()`) that respects `NEXT_PUBLIC_API_URL`.
- Replaced scattered hardcoded `http://localhost:8000` references across the frontend with the new centralized helper.

### 4. Documentation
- Created root `README.md` with:
  - Tech stack overview
  - Getting started instructions (Node, pnpm, Python, uv)
  - Development commands
  - Environment variable setup guidance
  - Project structure overview
  - Notes on loading data via the ETL

## Key Outcomes

- Clean monorepo root with proper tooling.
- Removal of ~350+ lines of dead/duplicate legacy code.
- Consistent and correct configuration across the stack.
- Improved onboarding experience via root documentation and scripts.
- Better separation between Phase 0 cleanup and Phase 1 feature/architecture work.

## Current State After Phase 0

- Modern Next.js 16 + shadcn/ui setup in `apps/web/`.
- Clean FastAPI project in `apps/api/` (Python 3.11+).
- Proper monorepo scripts at the root.
- Centralized API URL handling.
- Clear getting-started documentation.

## Relationship to Phase 1

Phase 0 was intentionally kept lightweight and focused on hygiene. It established a solid foundation so that Phase 1 (Backend Hardening) could focus on architectural improvements, code quality, observability, and API design without being slowed down by legacy cleanup.

See [PHASE1_SUMMARY.md](./PHASE1_SUMMARY.md) for the detailed outcomes of the subsequent hardening phase.

## How to Review This Branch

The Phase 0 work consists of a small number of focused commits:

- `3f27fa8` — Legacy src/ and duplicate button removal (biggest cleanup)
- `f1a9fc9` — Config fixes (shadcn, Python version, pnpm-workspace removal, .env.example)
- `c344ebe` — API helper introduction + removal of localhost hardcodes
- `5da601e` — Gitignore scoping fix
- `634b9ac` — Root package.json for monorepo DX
- `45d2a34` — Final cleanup + root README

Reviewing these commits in order shows a clear progression from "remove broken legacy code" → "fix configuration" → "improve developer experience and documentation."

---

*This document was created at the conclusion of the Phase 0 housekeeping work.*