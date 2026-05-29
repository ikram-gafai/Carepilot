# CAREPILOT Screenshot Checklist

Use for PFE report illustrations, jury demo backup, and orchestration validation. Capture at **1920×1080** or **1440×900**, browser zoom **100%**, light theme unless report specifies dark.

## Prerequisites

```bash
bun run dev
# Ensure demo scenarios seeded — see docs/demo-scenarios/demo-manifest.json
```

Login as agent persona (see `lib/auth/demo-login-personas.ts`).

---

## A. Architecture & platform (optional static exports)

| # | Asset | Source |
|---|-------|--------|
| A1 | Global architecture diagram | Export Mermaid from `docs/architecture/01-global-architecture.md` |
| A2 | AI module diagram | Export from `docs/architecture/02-ai-architecture.md` |
| A3 | Orchestration flow diagram | Export from `docs/architecture/03-orchestration-flow.md` |

---

## B. Agent dashboard

| # | Page | Capture |
|---|------|---------|
| B1 | `/agent/dashboard` | Full page — 6 KPI cards + 3 charts (status, priority, SLA) |
| B2 | Same | “At risk” table with at least one CARE ID visible |

**Report caption:** *Operational queue overview — SLA and escalation KPIs without per-module AI clutter.*

---

## C. Ticket investigation (core deliverable)

Capture **right sidebar operational intelligence panel** fully visible.

| # | URL | Scenario | Must show |
|---|-----|----------|-----------|
| C1 | `/agent/tickets/4` | Incomplete | Step 01 Poor quality, sticky “Request information”, missing-field warnings |
| C2 | `/agent/tickets/3` | Local resolution | KM-OP-004 HIGH match, “Resolve locally”, low risk collapsed |
| C3 | `/agent/tickets/1` | Escalation | Sticky “Escalate to N3”, SLA + escalation High in step 02 |
| C4 | `/agent/tickets/5` | SLA critical | Command bar SLA critical tone + explanation SLA paragraph |
| C5 | `/agent/tickets/2` | Transfer | Transfer required, weak KM match, transfer action |
| C6 | `/agent/tickets/6` | False escalation | Moderate escalation + Apply KM / strong KM |
| C7 | `/agent/tickets/7` | Ambiguity | Two KM alternatives, transfer recommendation |
| C8 | `/agent/tickets/8` | Monitoring | Monitor action, low severity risk |

> Ticket IDs from current seed — verify in `docs/demo-scenarios/demo-manifest.json`.

**Report caption template:** *Unified operational intelligence workflow — quality, risk, action, KM, and LLM explanation in one investigation panel.*

---

## D. Orchestration API (technical appendix)

| # | Capture | How |
|---|---------|-----|
| D1 | JSON payload | Browser or curl: `GET /api/ai/orchestration/1` — show `ticketQuality`, `operationalRisk`, `recommendedAction` |
| D2 | `meta.primarySignal` | Same response — highlight `"action"` |

---

## E. Admin supervision (optional)

| # | Page | Capture |
|---|------|---------|
| E1 | `/admin/escalations` | Escalation supervision view |
| E2 | `/admin/recommendations` | Recommendations / AI metrics |

---

## F. ML benchmarks (static files — no screenshot needed)

Use PNGs from `ml/plots/03_*_benchmark_results_table.png` — see [REPORT_VISUALS_INDEX.md](./REPORT_VISUALS_INDEX.md).

---

## Recommended report figure order

1. Global architecture (A1)
2. AI architecture (A2)
3. Orchestration flow (A3)
4. Ticket investigation — incomplete (C1)
5. Ticket investigation — escalation (C3)
6. Escalation benchmark table (`03_escalation_benchmark_results_table.png`)
7. LLM explanation benchmark table (`03_llm_explanation_benchmark_results_table.png`)
8. Demo scenario matrix — table from `docs/demo-scenarios/README.md`

---

## Quality checklist

- [ ] No browser devtools visible
- [ ] No personal data / real store PII beyond seeded fictitious data
- [ ] CARE IDs readable in command bar
- [ ] Operational intelligence panel not truncated (scroll if needed, stitch or full-height capture)
- [ ] Consistent theme across all ticket screenshots
