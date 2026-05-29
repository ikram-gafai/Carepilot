# Scenario 05 — SLA critical (payment authorization outage)

## Objective

Demonstrate SLA breach, P1 urgency, multi-lane payment outage, and escalation with operational explanation.

## Ticket context

| Field | Value |
|-------|-------|
| CARE ID | `CARE-DEMO-00005` |
| Store | Paris Auteuil |
| Category | PAYMENT |
| Lanes | SCO 1–6 |
| SLA | **Already breached** |
| Priority | P1 |

**Situation:** Acquirer timeout PAY-AUTH-903 on six SCO lanes. ~40 baskets queued. Cash lanes OK. TTR 2h consumed.

## Expected AI behavior

| Signal | Expected |
|--------|----------|
| SLA | **At risk / breach · High** |
| Escalation | Required · ~93% |
| Priority | P1 |
| Action | **Escalate to N3** |
| KM | KM-OP-002 medium — diagnostic only |

## Orchestration highlights

- SLA signal is dominant risk alongside escalation
- Explanation emphasizes **business impact and SLA**
- Command bar SLA indicator in critical tone

## Screenshots checklist

- [ ] Command bar — SLA critical badge
- [ ] Step 02 — SLA + Escalation High
- [ ] Step 03 + sticky bar — Escalate to N3
- [ ] Explanation — SLA impact narrative

## Agent URL

**`/agent/tickets/5`** (`CARE-DEMO-00005`)
