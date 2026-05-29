# CAREPILOT operational architecture (MVP)

> **Updated:** See the full architecture pack in [`docs/architecture/`](./architecture/README.md) and report assets in [`docs/report/`](./report/README.md).

## Active schemas

| Schema | Purpose |
|--------|---------|
| `care_source` | CARE system of record (70 tickets + stores, registers, actions, comments) |
| `cp_agent` | Synchronized operational store for Agent/Admin UI + AI outputs |
| `carepilot` | **Auth only** (`users`, `sessions`) |

## Sync flow (internal — no frontend sync page)

```
care_source.tickets (70)
    → background scheduler / POST /api/sync/run (internal)
    → runMvpCareSync() — tickets only
    → cp_agent.tickets
    → getCarePilotOperationalMetrics()
    → Admin / Agent dashboards
```

- Scheduler starts from `instrumentation.ts` unless `DISABLE_SYNC_SCHEDULER=1`.
- APIs kept: `/api/sync/run`, `/api/sync/status`, `/api/sync/logs` (not linked in UI).

## Operational intelligence (orchestrated)

Nine AI modules write to `cp_agent.ai_*` tables. The orchestrator (`lib/ai/orchestration/`) aggregates signals into one payload for the ticket investigation UI.

```
GET /api/ai/orchestration/{ticketId}
→ { ticketQuality, operationalRisk, recommendedAction, kmRecommendation, operationalExplanation }
```

## Demo scenarios

Eight PFE demo tickets: `bun run db:seed:demo-scenarios` → [`docs/demo-scenarios/demo-manifest.json`](./demo-scenarios/demo-manifest.json)

## Reset commands

```bash
bun run db:reset:operational-mvp
bun run db:seed:care-operational
bun run db:seed:cp-agent
bun run db:sync
bun run db:seed:demo-scenarios
```
