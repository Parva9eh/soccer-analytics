# Security Policy

## Reporting a vulnerability

If you discover a security issue, please **do not** open a public GitHub issue.

Contact the repository owner privately through GitHub Security Advisories or direct message. Include steps to reproduce and impact assessment.

## Secrets and credentials

**Never commit:**

- `apps/api/.env`
- `apps/web/.env.local` (or any `.env*` file with real values)
- API keys, JWT secrets, service role keys, database passwords, or OAuth client secrets
- Private keys (`.pem`, SSH keys, certificates)

**Safe to commit:**

- `apps/api/.env.example` and `apps/web/.env.example` (placeholders only)
- Supabase migration SQL and RLS policies
- CI workflow dummy test credentials in `.github/workflows/ci.yml`

Copy examples to local env files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Local review notes and ops dumps belong under **`local/`** (gitignored).

## Pre-commit protection

This repo uses a git hook to block accidental env-file commits. After cloning:

```bash
git config core.hooksPath .githooks
```

## Production deployment

- Set `REQUIRE_AUTH=true` on the API and `NEXT_PUBLIC_AUTH_ENABLED=true` on the web app.
- Never expose the Supabase **service role** key in the frontend or public repos.
- The web **anon** key is public by design; data access must be enforced with Supabase RLS.
- Rotate Supabase keys if you suspect exposure.
- Apply all `supabase/migrations/` on hosted Supabase (SQL Editor or CLI), including Phase 7 membership hardening (`20260710120000_secure_workspace_membership.sql`) — **applied** (July 2026).

## Workspace membership & datasets

- Users **must not** insert into `workspace_members` via PostgREST. Membership is created only through `SECURITY DEFINER` RPCs (`create_workspace_for_user`, `accept_workspace_invitation`) with server-forced roles.
- `seed_default_workspace_dataset` is **not** executable by `authenticated` clients; only definer paths call it.
- After deploy, re-apply the Phase 7.1 migration if an older project still has `workspace_members_insert_self`.

## Auth redirects

Post-login / OAuth / email-confirm `next` parameters must be **same-origin relative paths** only (`safeReturnPath`). Absolute URLs and `//host` scheme-relative values are rejected.

## E2E auth flag

- `NEXT_PUBLIC_E2E_AUTH` is for Playwright only.
- It is **hard-disabled when `NODE_ENV === "production"`** even if the env var is set.
- **Never** set `NEXT_PUBLIC_E2E_AUTH=true` on Vercel production.

## Guest / demo data

Anonymous (guest) users may read the public **La Liga 2020/2021** demo dataset via RLS. Workspace, profile, and collaboration data require authentication.

## Supported versions

| Version | Supported |
|---------|-----------|
| `main`  | Yes       |
