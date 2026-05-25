# CAREPILOT

Internal operational assistance platform (Front Office VLP): sync from a CARE simulator (`care_source.*`), enrichment in `carepilot.*`, semantic search with PostgreSQL + pgvector, and an ITSM-style console UI.

## Prerequisites

- [Bun](https://bun.sh/) (or equivalent Node)
- Docker (PostgreSQL + pgvector via `docker-compose.yml`)

## Database setup

```bash
docker compose up -d

cp .env.example .env.local   # recommended; otherwise scripts use the default Docker URL (see below)

bun run db:ping

bun run db:init

bun run db:seed
```

Without `.env` / `.env.local` or without `DATABASE_URL`, scripts use **`postgresql://carepilot:carepilot@localhost:5433/carepilot`** (host port from compose). The container listens on **5433** on the host to avoid clashes with a system PostgreSQL often already on **5432** (common on Windows). Add `.env.local` to override.

### Docker: database creation and Drizzle

On the **first** `docker compose up -d`, the Postgres image automatically creates:

- user: `carepilot`
- password: `carepilot`
- **database**: `carepilot` (`POSTGRES_DB`)

You do not need to create the database manually unless you want an **extra** database (then `docker exec -it carepilot-postgres psql -U carepilot -d postgres -c "CREATE DATABASE ..."`).

**Drizzle connection**: the same `DATABASE_URL` is used by the app ([`lib/db/index.ts`](lib/db/index.ts)) and Drizzle Kit ([`drizzle.config.ts`](drizzle.config.ts), which loads `.env` / `.env.local` like the scripts).

Useful commands (container already running, SQL schema applied with `db:init` or aligned with Drizzle):

| Command | Purpose |
| ------- | ------- |
| `bun run db:ping` | Check that Postgres responds |
| `bun run db:push` | Push the schema from `lib/db/schema/*.ts` to the database |
| `bun run db:studio` | Drizzle Studio UI for this database |
| `bun run db:generate` | Generate SQL migration files under `./drizzle` |

MVP workflow: **`docker compose up -d`** then **`DATABASE_URL=…5433/carepilot`** in `.env` / `.env.local`, then **`bun run db:init`** (DDL + `vector` extension) before **`db:seed`**.

The seed creates **520 anonymized operational tickets** by default (adjust with `SEED_TICKET_COUNT`).

### Demo checklist (happy path)

1. **Docker**: `docker compose up -d`
2. **Schema**: `bun run db:init`
3. **Simulator data**: `bun run db:seed`
4. **App**: `bun run dev`
5. **Sync CARE → CAREPILOT**: call `POST /api/sync/care` in a loop until `pendingRemaining: 0` (batched; see below).
6. **UI**: `/dashboard` then `/tickets` → open a ticket (`/tickets/[id]`): analysis, similar tickets, KM, escalation & transfer, timeline.
7. **ML preparation**: use `bun run db:ensure-ml-training`, `bun run db:seed:ml-training`, and the notebooks under `ml/notebooks/escalation`.

### Schema and Drizzle

- Local DDL source of truth is `sql/init.sql` (`db:init`).
- Optional: align a dev environment with `bun run db:push`, or generate migration files with `bun run db:generate` (`DATABASE_URL` + `drizzle.config.ts`), without replacing the Docker bootstrap above.

### ML benchmarking

Escalation prediction benchmarking is organized under `ml/notebooks/escalation`, with shared outputs in `ml/artifacts`, `ml/plots`, and `ml/reports`.

### Tests

```bash
bun test tests
```

Optional Postgres smoke: `RUN_INTEGRATION=1` and `DATABASE_URL` pointing at a reachable instance.

## CARE → CAREPILOT sync

```bash
curl -X POST http://localhost:3000/api/sync/care
```

Processing is **batched** (`CARE_SYNC_BATCH_LIMIT`, default **80**) to limit timeouts; repeat the call until `pendingRemaining: 0`.

Each synced ticket runs the pipeline: analysis → pgvector embedding → similar tickets → KM recommendations → escalation & transfer suggestion → aggregate updates shown on the **dashboard**.

## Next.js app

```bash
bun run dev
```

- `/dashboard` — aggregated metrics (PostgreSQL)
- `/tickets` and `/tickets/[id]` — queue and detail (timeline, recommendations, escalation/transfer, agent override)
- `/sync`, `/km`, `/escalation-transfer`, `/settings`

## Main APIs

Uniform error responses: `{ "ok": false, "error": "…" }` (HTTP 4xx/5xx per route).

- `POST /api/sync/care` — batch sync; response body unchanged (`ok`, `imported`, `updated`, `pendingRemaining`, …).
- `POST /api/tickets/analyze` · `POST /api/tickets/similar` · `POST /api/km/recommend` · `POST /api/decision/assist` — body `{ "ticketId": number }`; success `{ "ok": true, "ticketId", "stage": "…" }`.
- `GET /api/dashboard/metrics` — `{ "ok": true, …metrics }` (backlog, `ticketsByStatus`, last sync, etc.).
- `PATCH /api/tickets/[id]/decision` — manual agent decision `{ "agentFinalDecision": "…", "notes"? }`.

## shadcn/ui

Add components:

```bash
npx shadcn@latest add button
```
