# Scenario 01 — Escalation (SCO sync failure)

## Objective

Demonstrate high escalation probability, elevated SLA risk, and N3 routing after exhausted local SCO troubleshooting.

## Ticket context

| Field | Value |
|-------|-------|
| CARE ID | `CARE-DEMO-00001` |
| Store | Lyon Part-Dieu hypermarket |
| Perimeter | SCO |
| Status | In progress |
| Priority | P1 |

**Situation:** SCO lanes 11–12 fail basket finalization after payment. Local cache clear and service restart failed. Error SCO-4421 on lane 12. Peak Saturday traffic — no workaround.

## Expected AI behavior

| Signal | Expected |
|--------|----------|
| Escalation | Required · ~91% confidence |
| SLA | At risk · High severity |
| Priority | P1 |
| Action | **Escalate to N3** |
| Quality | Complete (~92%) |
| KM | Weak match (KM-OP-001 partial) |

## Orchestration highlights

- Primary signal: **recommended action** → Escalate to N3
- Risk panel: escalation + SLA both **High**
- Explanation emphasizes SLA impact and exhausted local recovery

## Screenshots checklist

- [ ] Sticky bar: **Escalate to N3**
- [ ] Step 02 risk expanded — escalation + SLA High
- [ ] Step 05 explanation — N3 bridge next steps
- [ ] Command bar SLA warning tone

## Agent URL

**`/agent/tickets/1`** (`CARE-DEMO-00001`)
