# Soccer Analytics - Project Plan

**Repository:** [soccer-analytics](https://github.com/Parva9eh/soccer-analytics)  
**Current Phase:** Phase 1 Complete (as of May 2026)

---

## Vision & Goals

Build a professional, production-ready full-stack soccer data analysis platform for coaches and serious fans.

The platform should provide high-quality visualizations, meaningful metrics, and a smooth experience using StatsBomb open data, while maintaining excellent code quality, maintainability, and developer experience.

---

## Guiding Principles & Key Decisions

- **Professional Quality First**: Prioritize code quality, consistency, observability, and maintainability over rapid feature development.
- **Supabase as the Platform**: Use Supabase (Postgres + Auth + Realtime + Storage) as the primary backend platform.
- **Full Auth + RLS from the Start**: No public demo fallback. Authentication and Row Level Security are core architectural requirements.
- **Multi-Competition Support**: Design schema, queries, UI, and data models to support multiple competitions from day one.
- **Free-Tier Friendly Initially**: Target Vercel (frontend) + Render/Railway (backend) for early hosting, with awareness of limitations.
- **Incremental & Reviewable**: All work is done in small, reviewable increments on dedicated branches with explicit approval gates.
- **Real-time as a Future Differentiator**: Supabase Realtime is viewed as a high-value future capability rather than a Phase 1 priority.

---

## Phased Roadmap

### Phase 0: Housekeeping & Monorepo Foundation (Completed)

**Goal:** Clean up legacy code, establish proper monorepo structure, fix configuration issues, and improve the overall developer experience before beginning major feature or architecture work.

**Key Deliverables:**
- Removal of legacy `src/` boilerplate and duplicate components in the Next.js app
- Python version downgrade from 3.14 → 3.11 for better ecosystem compatibility
- Proper monorepo tooling (root `package.json` with convenient scripts)
- Centralized API URL handling in the frontend (`apps/web/lib/api.ts`)
- Corrected shadcn/ui configuration and removal of misplaced `pnpm-workspace.yaml`
- Scoped `.gitignore` rules to protect frontend `lib/` directory
- Added root `README.md` with getting started guide
- Added `apps/web/.env.example`

**Branch:** `phase0/housekeeping`

**Summary:** [PHASE0_SUMMARY.md](./PHASE0_SUMMARY.md)

---

### Phase 1: Backend Hardening & Developer Experience (Completed)

**Goal:** Transform the backend into a professional, observable, consistent, and maintainable system.

**Key Deliverables:**

**Architecture & Reliability**
- Supabase client dependency injection (factories + `Depends()`)
- Elimination of N+1 queries on `/matches` using Supabase embedded selects
- Full modularization of the ETL pipeline into a clean, maintainable package
- Centralized configuration via Pydantic Settings

**Observability & Quality**
- Structured logging (JSON + text) with full request logging middleware
- Complete `X-Request-ID` propagation across logs and error responses
- Comprehensive error handling system (`ErrorCode` enum, consistent `ErrorResponse`, global handlers)
- Full Pydantic v2 modernization (no more `schema_extra` / `class Config` deprecation warnings)

**API Quality**
- Reusable, validated query parameter models (`PaginationParams`, `LimitParams`, `MatchListParams`)
- Request validation hardening across endpoints
- Significantly improved health endpoints with observability metadata

**Security & Configuration**
- Configurable CORS
- Security headers middleware
- Removal of scattered environment variable access

**Documentation**
- Comprehensive `.env.example` covering all settings
- Professional `apps/api/README.md`

**Branch:** `phase1/backend-hardening`

**Summary:** [PHASE1_SUMMARY.md](./PHASE1_SUMMARY.md)

---

### Phase 2: Frontend Completion (Planned)

**Goal:** Deliver a complete and polished user experience on the frontend.

**Planned Work:**
- Implement the missing `/players` and `/analytics` pages
- Robust data fetching, loading states, error handling, and empty states using TanStack Query
- Consistent use of the centralized API client
- Enhanced visualizations and interactions on existing pages
- Responsive design and accessibility improvements
- Error boundaries and graceful degradation

---

### Phase 3: Authentication, Authorization & Collaboration (Planned)

**Goal:** Implement secure access control and collaboration features.

**Planned Work:**
- Full Supabase Auth integration (email + social providers)
- Row Level Security (RLS) policies across all tables
- User workspaces / teams
- Role-based access (coach, analyst, viewer, admin)
- Private saved analyses, reports, and dashboards
- Invitation and sharing flows

---

### Phase 4: Core Analytics Capabilities (Planned)

**Goal:** Deliver meaningful analytical value beyond raw event data.

**Planned Areas:**
- Expected Goals (xG) models and visualizations
- Passing networks and progressive passing metrics
- Possession chains and build-up analysis
- Player and team aggregates / profiles
- Tactical event filtering and pattern detection
- Comparison tools (player vs player, team vs team, match vs match)

---

### Phase 5: Quality, Performance & Deployment (Planned)

**Goal:** Make the system reliable, testable, and deployable.

**Planned Work:**
- Automated testing (unit, integration, API contract tests)
- CI/CD pipeline
- Performance optimization (caching, query optimization, materialized views)
- Monitoring, alerting, and logging improvements
- Containerization (Docker) and infrastructure as code
- Deployment to chosen hosting platforms
- Cost and performance monitoring

---

### Future / Stretch Goals

- Real-time features using Supabase Realtime (live match updates, collaborative analysis)
- Mobile-responsive experience or dedicated mobile app
- Export capabilities (PDF reports, CSV, images)
- Advanced sharing and embedding features
- Integration with additional data sources
- Community / public analysis sharing features

---

## Current Status (as of May 2026)

| Phase | Status      | Notes |
|-------|-------------|-------|
| Phase 0 | ✅ Completed | Monorepo hygiene and foundation |
| Phase 1 | ✅ Completed | Backend hardening & developer experience |
| Phase 2 | Planned     | Frontend pages and UX |
| Phase 3 | Planned     | Auth, RLS, and workspaces |
| Phase 4 | Planned     | Real analytics features |
| Phase 5 | Planned     | Testing, CI, and deployment |

Detailed summaries for completed phases are available in the linked documents above.

---

## How to Contribute / Review

- All major work happens on dedicated feature branches (e.g., `phase0/housekeeping`, `phase1/backend-hardening`).
- Changes are kept small and reviewable where possible.
- Significant architectural decisions are discussed before implementation.

---

*This is a living document. It will be updated after each major phase is completed.*