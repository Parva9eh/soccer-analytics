# Phase 7 Plan — Production Hardening (Code Review Remediation)

**Status:** Planned → implementing (July 2026)  
**Source:** Strict code quality review (`local/CODE_REVIEW.md`, review id `fb805db8`)  
**Data decision:** Keep **StatsBomb Open Data** as the primary analytics source (API-Football free is not a replacement for event-level pitch/xG work).

## Goal

Close production-blocking security issues, fix analytics correctness/performance, and restructure the highest-complexity modules so the codebase is safe to extend. Preserve behavior for guests (La Liga demo) and signed-in workspaces.

## Branching

| Slice | Branch | Focus |
|-------|--------|--------|
| Plan | `phase7/plan-docs` | This document + `PLAN.md` / `.gitignore` (`/local/`) |
| 7.1 | `phase7/security-p0` | RLS, open redirects, per-request Supabase clients, seed RPC, JWT audience |
| 7.2 | `phase7/security-config` | REQUIRE_AUTH footgun, health surface, E2E prod hard-disable, SECURITY.md |
| 7.3 | `phase7/analytics-perf` | Events double-fetch, season pagination, possession batch, get_match 404 |
| 7.4 | `phase7/services-layer` | `services/season_scope`, thin routers, cache TTL/LRU |
| 7.5 | `phase7/match-page-refactor` | Match detail decompose, dynamic 3D, multipage events, shared types |
| 7.6 | `phase7/analytics-dashboard` | Unify auth/legacy dashboard, query invalidation, cold-start polish |

**Workflow:** branch from latest `main` (or previous merged phase7 slice) → implement → PR with merge commit → retain branch.

**Operator step after 7.1:** apply new Supabase SQL migrations on hosted project (SQL Editor or CLI).

---

## 7.1 — Security P0 (production blockers)

**Review issues:** 1, 2, 3, 4, 9

| Task | Detail |
|------|--------|
| RLS membership insert | Drop `workspace_members_insert_self`. Membership only via `SECURITY DEFINER` RPCs (`create_workspace_for_user`, `accept_workspace_invitation`) with server-forced roles. |
| Seed RPC | `REVOKE EXECUTE` on `seed_default_workspace_dataset` from `authenticated`; keep callable only from definer paths. |
| Open redirects | Shared `safeReturnPath` — same-origin relative paths only. Wire into OAuth callback, email confirm, middleware, AuthForm. |
| Supabase clients | Never mutate `@lru_cache` anon client Authorization. New anon client (or equivalent isolation) per user-scoped request. |
| JWT audience | Fail closed on `aud`; remove `verify_aud: False` fallback. |

**Migration:** `supabase/migrations/20260710120000_secure_workspace_membership.sql` (timestamp may adjust).

**Tests:** RLS policy expectations where feasible; unit tests for `safeReturnPath`; client isolation test for JWT header mutation; JWT aud rejection.

---

## 7.2 — Security / config hardening

**Review issues:** 14, 15, 16 (+ docs)

| Task | Detail |
|------|--------|
| `get_supabase` footgun | Remove anonymous service-role path or force safe default; keep service client for ETL/health only. Align `.env.example` + production checklist. |
| E2E auth | Hard-disable when `NODE_ENV === "production"`; document never set `NEXT_PUBLIC_E2E_AUTH` on Vercel production. |
| Health endpoints | Boolean readiness without `matches_count` on public probes (or gate counts behind admin/probe secret). |
| SECURITY.md | Document membership RPC-only rule, redirect policy, E2E flag, migration apply step. |

---

## 7.3 — Analytics & API performance / correctness

**Review issues:** 5, 6, 7, 8

| Task | Detail |
|------|--------|
| `get_match` | Do not map `HTTPException` → 500; re-raise or drop bare catch. |
| Events list | Single count+page query (or count-only + page); avoid full-row materialization for totals. |
| Season event loads | Paginate like zones (`_PAGE_SIZE = 1000`) for passes, xG, profiles, possession helpers. Treat silent PostgREST caps as correctness bugs. |
| Season possession | Batch events by match_id set (paginated), partition in memory — delete per-match N+1 loop. |

---

## 7.4 — Services layer & cache

**Review issues:** 11, 13

| Task | Detail |
|------|--------|
| `services/season_scope.py` | Canonical `resolve_season_match_ids`, match team helpers. |
| Routers | Thin HTTP; stop private cross-router imports (`from routers.X import _private`). |
| Domain | Move aggregation/chain building toward `analytics/` or `services/`. |
| Zone cache | Wire `SEASON_ZONE_CACHE_TTL_SECONDS`; max entries + LRU; prefer aggregates over raw season lists where easy. |

---

## 7.5 — Match page refactor

**Review issues:** 10, 18, 19

| Task | Detail |
|------|--------|
| Decompose | `useMatchDetailState` + `MatchHeader` / `MatchPitchWorkspace` / `MatchEventsTable` / `EventDetailSheet`. |
| State model | Discriminated `PitchWorkspace` union (events/shots/passes) instead of cross-mode boolean spaghetti. |
| Code-split 3D | `next/dynamic` for `ThreeDPitch` (`ssr: false`) only when 3D is on. |
| Events | Multipage or dedicated slim pitch endpoint until all events loaded (not hard 500 cap). |
| Types | Shared `lib/event-types.ts`; delete thin `use-active-workspace` if still a pass-through. |
| Perf | Memoized minute histogram for density strip. |

---

## 7.6 — Analytics dashboard unify & UX polish

**Review issues:** 12, 17

| Task | Detail |
|------|--------|
| One dashboard | Merge `AuthAnalyticsDashboard` + `LegacyAnalyticsPage` into one tree with `scope: "workspace" \| "demo"`. |
| Queries | Shared `useSeasonAnalyticsQueries` (and optional later season-overview API). |
| Invalidation | Expand workspace-scoped React Query prefixes to all analytics keys. |
| Cold start | Reduce auth-me → workspaces waterfall where safe (parallelize or richer bootstrap). |

---

## Out of scope for Phase 7

- Switching data provider to API-Football (rejected as primary; StatsBomb remains).
- Commercial StatsBomb/Opta contracts.
- Full edge rate limiting / WAF (document as Hobby ops; optional later).
- Phase 6 product slices (realtime, sharing) — remain on Phase 6 track after hardening.

## Success criteria

- [ ] No open self-join membership RLS; seed RPC not executable by arbitrary users.
- [ ] Auth redirects cannot leave the app origin.
- [ ] Concurrent API requests cannot cross-contaminate JWT on Supabase clients.
- [ ] Season analytics aggregate over full PostgREST result sets (paginated), not silent 1000-row caps.
- [ ] Match detail is modular and does not statically pull three.js for 2D-only sessions.
- [ ] Single analytics dashboard code path for guest and signed-in.
- [ ] CI green; hosted Supabase migration applied for 7.1.

## Status tracker

| Slice | Status |
|-------|--------|
| 7.0 plan-docs | 🔄 In progress |
| 7.1 security-p0 | ⏳ Pending |
| 7.2 security-config | ⏳ Pending |
| 7.3 analytics-perf | ⏳ Pending |
| 7.4 services-layer | ⏳ Pending |
| 7.5 match-page-refactor | ⏳ Pending |
| 7.6 analytics-dashboard | ⏳ Pending |
