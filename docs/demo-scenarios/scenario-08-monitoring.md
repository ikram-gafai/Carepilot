# Scenario 08 — Monitoring / observation

## Objective

Demonstrate monitor recommendation with low confidence and limited escalation urgency for unreproduced intermittent issues.

## Ticket context

| Field | Value |
|-------|-------|
| CARE ID | `CARE-DEMO-00008` |
| Store | Paris Saint-Marcel Market |
| Perimeter | SCO |
| Status | **Monitoring** |
| Lane | SCO-STM-08 |
| Priority | P4 |

**Situation:** Occasional SCO screen freeze during idle. No freeze in 4 hours. No error captured. Store accepts monitoring until reproduction.

## Expected AI behavior

| Signal | Expected |
|--------|----------|
| Action | **Monitor** · ~84% |
| Escalation | Low |
| Transfer | Low |
| SLA | Low risk |
| Quality | Incomplete (missing error + reproduction) |
| KM | Partial match only |

## Orchestration highlights

- Primary decision: **Monitor** — low urgency throughout
- Risk section defaults **collapsed** (low severity)
- Quality incomplete but action is observe, not request info first

## Screenshots checklist

- [ ] Sticky bar — Monitor
- [ ] Step 02 collapsed
- [ ] Step 01 — Incomplete quality, not Poor
- [ ] Explanation — capture plan next steps

## Agent URL

**`/agent/tickets/8`** (`CARE-DEMO-00008`)
