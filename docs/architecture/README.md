# CAREPILOT Architecture Documentation

Enterprise AI-assisted ITSM platform for Carrefour FO/VLP operations — architecture reference for PFE report, jury presentation, and technical onboarding.

## Documents

| Document | Contents |
|----------|----------|
| [01 — Global architecture](./01-global-architecture.md) | Platform layers, schemas, sync, UI surfaces |
| [02 — AI architecture](./02-ai-architecture.md) | Nine AI tasks, models, artifacts, storage |
| [03 — Orchestration flow](./03-orchestration-flow.md) | Signal aggregation, unified payload, ticket UX |

## Related

- [Demo scenarios](../demo-scenarios/README.md) — 8 end-to-end PFE demo tickets
- [Report assets](../report/README.md) — screenshot checklist and benchmark visuals index
- [Operational MVP (legacy)](../OPERATIONAL_ARCHITECTURE.md) — original sync/KPI notes

## One-line summary

**CARE** (`care_source`) → **sync** → **CAREPILOT** (`cp_agent`) → **nine AI modules** → **orchestration layer** → **agent investigation UI**.
