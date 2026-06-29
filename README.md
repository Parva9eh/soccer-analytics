# Soccer Analytics

Professional full-stack soccer data analysis platform for coaches and serious fans.

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python 3.11+) + Supabase (PostgreSQL)
- **Data Source**: StatsBomb Open Data
- **Visualization**: Custom SVG pitch with event filtering and interaction

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### Installation

```bash
# Clone the repo
git clone https://github.com/Parva9eh/soccer-analytics.git
cd soccer-analytics

# Install root convenience scripts
pnpm install

# Install web dependencies
cd apps/web
pnpm install

# Install API dependencies
cd ../api
uv sync
```

### Development

From the project root:

```bash
# See available commands
pnpm dev

# Start individual apps
pnpm dev:web          # Next.js on http://localhost:3000
pnpm dev:api          # FastAPI on http://localhost:8000
```

### Environment Variables

1. Copy the example files:
   - `apps/web/.env.example` → `apps/web/.env.local`
   - `apps/api/.env.example` → `apps/api/.env`

2. Fill in your Supabase credentials and backend URL.

3. Enable git hooks (blocks accidental `.env` commits):

```bash
git config core.hooksPath .githooks
```

See [SECURITY.md](SECURITY.md) for secrets handling and reporting vulnerabilities.

### Loading Data

Use the StatsBomb loader in the API:

```bash
cd apps/api
uv run python etl/statsbomb_loader.py --help
```

Start with a small dataset (recommended for testing).

## Git workflow (phases)

Each phase uses a dedicated branch (e.g. `phase3/auth-foundation`). When the phase is done, open a PR into `main` and merge with **“Create a merge commit”** — not squash. **Keep the phase branch** on the remote after merge. Details: [PLAN.md](./PLAN.md#how-to-contribute--review).

## Project Structure

```
soccer-analytics/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # FastAPI backend + ETL
├── package.json      # Root monorepo scripts
└── README.md
```

## License

Private project.

---

Built with ❤️ for the beautiful game.
