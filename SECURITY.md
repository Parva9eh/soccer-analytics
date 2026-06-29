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

## Guest / demo data

Anonymous (guest) users may read the public **La Liga 2020/2021** demo dataset via RLS. Workspace, profile, and collaboration data require authentication.

## Supported versions

| Version | Supported |
|---------|-----------|
| `main`  | Yes       |