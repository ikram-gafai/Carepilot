# CAREPILOT Demo Scenarios

Eight end-to-end operational scenarios for PFE demo, jury presentation, report illustrations, and orchestration validation.

## Quick start

```bash
# Prerequisites: operational stores + schema
bun run db:seed:care-operational
bun run db:seed:cp-agent
bun run db:ensure-ai-escalation
bun run db:ensure-ai-transfer
bun run db:ensure-ai-action
bun run db:ensure-ai-sla
bun run db:ensure-ai-priority
bun run db:ensure-ai-km
bun run db:ensure-ai-missing-information
bun run db:ensure-ai-operational-explanations

# Seed demo tickets + deterministic AI outputs
bun run db:seed:demo-scenarios
```

After seeding, open **`docs/demo-scenarios/demo-manifest.json`** for numeric ticket IDs and agent URLs.

### Seeded agent URLs (current environment)

| Slug | CARE ID | Agent URL |
|------|---------|-----------|
| escalation | `CARE-DEMO-00001` | `/agent/tickets/1` |
| transfer | `CARE-DEMO-00002` | `/agent/tickets/2` |
| local-resolution | `CARE-DEMO-00003` | `/agent/tickets/3` |
| incomplete-ticket | `CARE-DEMO-00004` | `/agent/tickets/4` |
| sla-critical | `CARE-DEMO-00005` | `/agent/tickets/5` |
| false-escalation-risk | `CARE-DEMO-00006` | `/agent/tickets/6` |
| network-payment-ambiguity | `CARE-DEMO-00007` | `/agent/tickets/7` |
| monitoring | `CARE-DEMO-00008` | `/agent/tickets/8` |

> IDs may differ after a fresh DB reset — re-run seed and refresh `demo-manifest.json`.

## Scenario index

| # | Slug | CARE ID | Primary story |
|---|------|---------|---------------|
| 1 | [escalation](./scenario-01-escalation.md) | `CARE-DEMO-00001` | SCO sync failure → Escalate N3 |
| 2 | [transfer](./scenario-02-transfer.md) | `CARE-DEMO-00002` | Loyalty / BO sync → Transfer perimeter |
| 3 | [local-resolution](./scenario-03-local-resolution.md) | `CARE-DEMO-00003` | Printer fault → Resolve locally + KM |
| 4 | [incomplete-ticket](./scenario-04-incomplete-ticket.md) | `CARE-DEMO-00004` | Vague report → Request information |
| 5 | [sla-critical](./scenario-05-sla-critical.md) | `CARE-DEMO-00005` | Payment outage → SLA breach + N3 |
| 6 | [false-escalation-risk](./scenario-06-false-escalation-risk.md) | `CARE-DEMO-00006` | Looks critical → KM preferred |
| 7 | [network-payment-ambiguity](./scenario-07-network-payment-ambiguity.md) | `CARE-DEMO-00007` | Payment vs network tradeoff |
| 8 | [monitoring](./scenario-08-monitoring.md) | `CARE-DEMO-00008` | Intermittent → Monitor |

## What each scenario validates

Every scenario includes:

- Realistic Carrefour FO/VLP ticket, comments, and timeline
- Deterministic AI outputs (Tasks 1–9) in `cp_agent.ai_*` tables
- Full orchestrated intelligence payload via `GET /api/ai/orchestration/:ticketId`
- Screenshot-ready operational intelligence sidebar (5-step workflow)

## Demo flow suggestion (15 min)

1. **Incomplete ticket** (04) — quality & request information  
2. **Local resolution** (03) — strong KM, low risk  
3. **False escalation risk** (06) — orchestration tradeoff  
4. **Transfer** (02) — perimeter reassignment  
5. **SLA critical** (05) — urgency + explanation  
6. **Escalation** (01) — full N3 path  

Optional: **Network ambiguity** (07), **Monitoring** (08).

## Screenshot checklist (global)

- [ ] Ticket command bar (status, priority, SLA, store)
- [ ] Flat investigation column (description, comments, timeline)
- [ ] Operational intelligence panel — numbered steps 01–05
- [ ] Sticky primary decision bar (when action available)
- [ ] Collapsible risk section with severity dots
- [ ] Operational explanation (step 05)

## Source files

- Definitions: `lib/care-operational/demo-scenarios.ts`
- Seed logic: `lib/ai/seed-demo-scenarios.ts`
- Script: `scripts/seed-demo-scenarios.ts`
