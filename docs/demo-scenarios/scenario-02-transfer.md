# Scenario 02 — Transfer (loyalty / back-office sync)

## Objective

Demonstrate transfer to back-office when loyalty symptoms originate from entitlement sync delay, not front-office payment.

## Ticket context

| Field | Value |
|-------|-------|
| CARE ID | `CARE-DEMO-00002` |
| Store | Paris Saint-Marcel Market |
| Perimeter | FIDELITE |
| Category | LOYALTY |
| Priority | P2 |

**Situation:** Carrefour+ balance mismatch at SCO after coupon. Payment path healthy. BO entitlement batch delayed (04:15 vs 02:00 window).

## Expected AI behavior

| Signal | Expected |
|--------|----------|
| Transfer | Required → back-office · ~88% |
| Escalation | Not required |
| Action | **Transfer perimeter** |
| KM | **Mismatch** — payment KM ranked low |
| SLA | Elevated risk · Medium |

## Orchestration highlights

- Transfer elevated; escalation stays low
- KM section shows **wrong perimeter** (payment vs loyalty) — supports transfer reasoning
- Explanation clarifies BO sync root cause

## Screenshots checklist

- [ ] Step 02 — Transfer required
- [ ] Step 04 — KM low confidence / wrong procedure
- [ ] Step 03 — Transfer perimeter action
- [ ] Explanation perimeter reassignment paragraph

## Agent URL

**`/agent/tickets/2`** (`CARE-DEMO-00002`)
