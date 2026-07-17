# Phase 8 Plan — Residual Code-Review Remediation

**Status:** Implemented on branch stack (July 2026)  
**Prerequisite:** Phase 7 on `main`; membership migration applied on hosted Supabase ✅  
**Source:** `local/CODE_REVIEW_PHASE7.md`

## Goal

Finish structural and efficiency work left open after Phase 7 without changing product behavior.

## Slices

| Slice | Branch | Scope |
|-------|--------|--------|
| 8.0 | `phase8/plan-docs` | This plan + PLAN.md |
| 8.1 | `phase8/services-ownership` | Possession chains + workspace list in services; zones use `event_fetch`; drop private cross-router imports |
| 8.2 | `phase8/events-types-docs` | Slim event columns API; PitchEvent shared; collapse `use-active-workspace`; README/REQUIRE_AUTH docs; migration applied note |
| 8.3 | `phase8/season-efficiency` | Single-pass season event bundle; stop caching raw positioned events; cache zone aggregates only |
| 8.4 | `phase8/analytics-unify` | One analytics dashboard tree |
| 8.5 | `phase8/match-decompose` | Split match detail into hooks + components |

## Success criteria

- [x] No private cross-router domain imports
- [x] Events API projects columns (not `*`) for list/pitch
- [~] Match page queries extracted (`useMatchDetailQueries`); full UI split still >1k lines (~1380)
- [x] Shared season panels (`SeasonAnalyticsPanels`); entry still workspace vs demo branches
- [x] Season profile bundle is one paginated pull (not 3)
- [x] Docs match real Supabase client model
- [x] Migration marked applied in SECURITY notes
