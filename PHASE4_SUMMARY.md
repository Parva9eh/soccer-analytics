# Phase 4.1: Expected Goals (xG) — Summary

**Branch:** `phase4/xg-foundation`  
**Status:** Phase 4.1–4.3 merged to `main`; 4.4 in progress on branch
**Date:** June 2026

## Purpose

Phase 4 delivers real analytics on StatsBomb event data. **4.1–4.3** are merged to `main`. **4.4 (profiles & compare)** continues on `phase4/xg-foundation`.

All analytics reads use the same workspace / guest demo RLS scope as existing match and event routes.

---

## 1. Backend — xG analytics module

### Package layout

| Path | Role |
|------|------|
| `apps/api/analytics/xg.py` | Pure helpers: parse `statsbomb_xg`, shot outcome, player/team from event `details` |
| `apps/api/schemas/xg.py` | Pydantic response models |
| `apps/api/routers/analytics_xg.py` | FastAPI routes under `/analytics/xg` |

Registered in `apps/api/main.py`.

### API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /analytics/xg/matches/{match_id}` | Per-team shots, goals, and xG for one match |
| `GET /analytics/xg/season?competition=&season=` | Season totals and avg xG per match |
| `GET /analytics/xg/players?competition=&season=&limit=` | Player xG leaderboard |
| `GET /analytics/xg/teams?competition=&season=` | Team xG leaderboard |
| `GET /analytics/xg/form?competition=&season=&team=&window=` | Per-match xG for/against with rolling averages (window 1–15, default 5) |

All routes use `get_supabase_public_read` (signed-in workspace scope or anon guest demo).

### Data source

- Shot events (`event_type = "Shot"`) with StatsBomb JSON in `events.details`
- xG field: `details.shot.statsbomb_xg`
- No new database tables or materialized views in 4.1

---

## 2. Frontend — match xG & shot map

### Match detail (`/matches/[id]`)

| Deliverable | Detail |
|-------------|--------|
| **xG strip** | Home/away shots, goals, and xG under the score card (`MatchXgStrip`) |
| **Shot map mode** | **Events \| Shot map** toggle on the pitch section |
| **Shot map** | Outcome-colored markers sized by xG, direction lines, All/Home/Away filter |
| **Tooltips** | Player, xG, outcome, minute, team on hover |
| **Event sheet** | Shot details (player, team, xG, outcome) when a shot is selected |

Client-side shot parsing: `apps/web/lib/shot-utils.ts` (mirrors API helpers).

Components: `ShotMapPitch`, `ShotMapLegend`.

---

## 3. Frontend — analytics dashboard

### `/analytics` (workspace and guest)

| Deliverable | Detail |
|-------------|--------|
| **Total xG KPI** | Season xG when scope is a single linked season |
| **Leaderboards** | Top players and teams by xG (`XgLeaderboards`) |
| **Rolling xG form** | Team selector, 3/5/10-match window, SVG chart (`XgFormChart`) |
| **Roadmap** | Expected Goals and Trends & form cards marked **live** |

Types: `apps/web/lib/xg-types.ts`.

Guest mode uses the public La Liga 2020/21 demo dataset (same as Phase 3).

---

## 4. Database — advisor fix

| Migration | Purpose |
|-----------|---------|
| `20250604290000_player_match_stats_rls.sql` | Enables RLS on `player_match_stats` if present on hosted Supabase (no-op if table missing) |

Documented in `supabase/README.md`. Operator step: run on hosted Supabase if the advisor flag appears.

---

## 5. Phase 4.2 — Passing networks (merged)

### API

| Endpoint | Purpose |
|----------|---------|
| `GET /analytics/passes/matches/{match_id}?team=` | Completed-pass network (nodes + edges) |
| `GET /analytics/passes/progressive?competition=&season=` | Teams ranked by progressive passes |

### Frontend

| Deliverable | Detail |
|-------------|--------|
| **Pass network** | Match page pitch mode — home/away, volume-weighted edges |
| **Progressive passes** | Analytics dashboard team ranking panel |

Progressive pass = completed pass moving ball ≥10 units toward goal (attack direction inferred from team pass locations).

---

## 6. Merge to `main`

```bash
git checkout main
git pull origin main
git merge --no-ff phase4/xg-foundation -m "Merge branch 'phase4/xg-foundation'"
git push origin main
```

Keep `phase4/xg-foundation` on the remote for Phase 4.2 work.

---

## Phase 4 checklist

### 4.1 (merged)
- [x] StatsBomb xG extraction, APIs, leaderboards, shot map, rolling form

### 4.2 (merged)
- [x] Pass network API + match UI
- [x] Progressive pass season leaderboard + analytics panel

### 4.3 (merged)
- [x] Possession chain API (match + season)
- [x] Match page possession panel + pitch filter
- [x] Analytics possession summary panel

### 4.4 (merged)
- [x] Player and team season profile APIs
- [x] Player vs player and team vs team compare APIs
- [x] Player page season stats; `/analytics/compare` UI

### 4.5 (merged)
- [x] Tactical event filtering on match page (final third, set pieces, counters, shots)
- [x] Match analytics profile API + match vs match compare API
- [x] `/analytics/compare` Matches tab
- [x] Player season radar chart on player detail page
- [x] Compare-match link from match detail page

---

### 4.6 (merged)
- [x] Tactical spatial heatmap on match page (client-side binning)
- [x] Phase breakdown panel (play pattern tagging)
- [x] Multi-player radar overlay on compare page
- [x] Copy link for sharing compare selections

---

### 4.7 (merged)
- [x] Team-split heatmaps (All / Home / Away / Split) on match page
- [x] Zone comparison panel by pitch third
- [x] Position-aware radar benchmarks on player and compare pages
- [x] Compare CSV export and radar PNG download

---

## Suggested next (Phase 4.8+)

1. PDF export for full comparison reports
2. Season-level zone aggregates
3. Team heatmaps on analytics dashboard