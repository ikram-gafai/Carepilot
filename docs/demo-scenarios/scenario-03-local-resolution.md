# Scenario 03 — Local resolution (receipt printer)

## Objective

Demonstrate low escalation risk, strong KM match, and local recovery for a peripheral hardware fault.

## Ticket context

| Field | Value |
|-------|-------|
| CARE ID | `CARE-DEMO-00003` |
| Store | Paris Auteuil hypermarket |
| Perimeter | MATERIEL |
| Lane | Checkout lane 7 · T-AUT-07 |
| Priority | P3 |

**Situation:** Receipt printer comms failure after paper reload. USB hub amber. Payment path OK. Error PRN-COMM-019. On-site module swap available.

## Expected AI behavior

| Signal | Expected |
|--------|----------|
| Escalation | Not required |
| Transfer | Not required |
| Action | **Resolve locally** |
| KM | **KM-OP-004 HIGH** (~91% match) |
| SLA | Low risk |
| Quality | Complete |

## Orchestration highlights

- Strong KM drives primary decision
- All risk signals **Low** — calm investigation UI
- Explanation focused on KM-led recovery path

## Screenshots checklist

- [ ] Step 04 expanded — KM-OP-004 HIGH + “Why this KM”
- [ ] Step 03 — Resolve locally
- [ ] Step 02 collapsed or all Low severity
- [ ] Full panel — enterprise minimal layout

## Agent URL

**`/agent/tickets/3`** (`CARE-DEMO-00003`)
