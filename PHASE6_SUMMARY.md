# Phase 6 Plan — Ops, Polish & Growth

**Status:** In progress (July 2026) — 6.1 ✅ complete on `main`  
**Branch:** `phase6/ops-polish` for 6.3+ slices  
**Prerequisite:** Phase 5 production live; Google OAuth + guest browsing verified ✅

## Goal

Harden production operations, close deferred UX gaps, and add high-value product extensions without destabilizing the Vercel + Supabase stack.

---

## 6.1 — Signed-in collaboration + `/backend` proxy ✅ (July 2026)

**Problem:** OAuth users could browse as guests but `/settings`, `/reports`, and `/analyses` failed; same-origin `/backend` proxy had auth and compression bugs.

**Delivered on `main`:**

| Area | Change |
|------|--------|
| API bootstrap | `POST /auth/bootstrap`, `BootstrapOnSignIn`, workspace empty lists |
| Query gating | `useCollaborationQueriesEnabled`, `useAuthMeQuery`, `CollaborationQuerySync` |
| `/backend` proxy | Route handler injects Bearer from cookies; **no** `next.config` rewrites (they bypassed auth) |
| Paths | Browser uses relative `/backend`; trailing slashes normalized |
| Compression | Strip `Content-Encoding` / request `identity` — fixes `ERR_CONTENT_DECODING_FAILED` |
| Middleware | Session refresh + auth injection on `/backend/*` |

**Verified in production:**

1. Guest browsing (`/matches`, `/players`, `/analytics`) loads via `/backend/*`
2. Google sign-in → sidebar workspace name
3. `/settings`, `/reports`, `/analyses` load (empty lists OK)
4. `/backend/auth/me` returns profile JSON when signed in

**If `/settings` shows “Setup required” (503):** apply all `supabase/migrations/` on hosted Supabase, especially `20250604170000_fix_workspace_rls_recursion.sql` and `20250604200000_workspace_create_rpc.sql`.

---

## 6.2 — Production ops (Hobby-friendly)

| Task | Owner | Notes |
|------|-------|-------|
| Uptime monitor | You | API `GET /health/ready` every 5 min (Better Stack, UptimeRobot, etc.) |
| Supabase migration audit | You | Dashboard → confirm tables: `profiles`, `workspaces`, `workspace_reports`, `saved_analyses` |
| OAuth production URLs | You | Supabase Site URL + redirect URLs; Google/GitHub app origins |
| Zone materialized view | Optional | Run `refresh_season_team_zone_stats()`; set `USE_ZONE_MATERIALIZED_VIEW=true` on API |
| Log review | Optional | API `LOG_FORMAT=json`; spot-check Vercel function logs after auth errors |

---

## 6.3 — Deferred Phase 2 polish

- Pitch-only overlay responsive audit (match detail 3D/2D on small screens)
- Collaboration empty states: clearer copy when workspace has no linked datasets
- Loading skeleton consistency on `/settings/workspaces/[id]`

---

## 6.4 — Realtime & live data (stretch)

- Supabase Realtime on `events` or match rows for “live” timeline updates
- Optional: broadcast workspace report refresh to collaborators
- Design: channel naming per `workspace_id` + RLS-compatible filters

---

## 6.5 — Data expansion

- Second competition/season in ETL + `workspace_datasets` linking UX
- Document StatsBomb loader for additional open competitions
- Catalog filters already multi-competition-ready — validate with 2+ seasons loaded

---

## 6.6 — Sharing & embeds

- Public read-only share links for reports (token + expiry)
- oEmbed or iframe-safe compare view (no auth)
- Export polish: PDF branding, report cover page

---

## 6.7 — Performance & cost

- Review `SEASON_ZONE_CACHE_TTL_SECONDS` under real traffic
- Supabase pooler connection limits on Hobby/Vercel cold starts
- Playwright smoke for signed-in path (`/settings` after mock bootstrap)

---

## Suggested implementation order

```
6.1 (auth + /backend proxy) → ✅ done
6.2 (ops checklist)         → you: uptime, migrations audit, OAuth URLs
6.7 (e2e proxy smoke)       → in progress on main
6.3 (polish)                → small UI PRs
6.5 (data)                  → if you want more than La Liga demo
6.4 (realtime)              → largest architectural slice
6.6 (sharing)               → after stable signed-in UX
```

### Next up for you (6.2 — no code)

1. Add uptime monitor on `https://<api-project>.vercel.app/health/ready`
2. Confirm Supabase tables + migrations applied
3. Double-check OAuth redirect URLs match your live web hostname

---

## Branch & merge

```bash
git checkout main && git pull
git checkout -b phase6/ops-polish
# … implement 6.3+ slices …
git merge --no-ff phase6/ops-polish  # when a slice is done
```

Update this file and [PLAN.md](./PLAN.md) when Phase 6 closes.

---

## Related docs

- [DEPLOY.md](./DEPLOY.md) — production env vars
- [supabase/README.md](./supabase/README.md) — migrations & OAuth
- [PHASE5_SUMMARY.md](./PHASE5_SUMMARY.md) — deployment & selective builds