# CARE → CAREPILOT operational architecture (MVP)

## Active schemas

| Schema | Purpose |
|--------|---------|
| `care_source` | CARE system of record (70 tickets + stores, registers, actions, comments) |
| `cp_agent` | Synchronized operational store for Agent/Admin UI |
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

## Dashboard (only operational UI)

KPIs from `cp_agent.tickets` (`source = 'CARE'`):

| KPI | Value |
|-----|--------|
| Open Tickets | Live count |
| SLA Risk | Due within 4h |
| Transfers | 0 |
| Escalate N3 | 0 |
| Sync Health | Healthy when fully synchronized |
| AI Status | Pending AI Training |

Operational Pressure: Open + SLA Risk by perimeter (Checkout, SCO, Payment, Network, Hardware).

Top Risks: SLA breach, queue overload, critical priority tickets.

## Reset commands

```bash
bun run db:reset:operational-mvp
bun run db:seed:care-operational
bun run db:seed:cp-agent
bun run db:sync
```
