# Scenario 06 — False escalation risk (KM available)

## Objective

Show moderate escalation signal overridden by strong KM-led resolution when ticket initially appears critical.

## Ticket context

| Field | Value |
|-------|-------|
| CARE ID | `CARE-DEMO-00006` |
| Store | Lyon Part-Dieu |
| Category | PAYMENT |
| Lane | Lane 3 · T-LYO-03 |
| Error | PAY-TMO-112 |

**Situation:** Single-lane card reader timeout looks severe. Acquirer status green. KM-OP-002 not yet executed.

## Expected AI behavior

| Signal | Expected |
|--------|----------|
| Escalation | Moderate (~55% probability) |
| Action | **Apply KM procedure** (preferred over N3) |
| KM | **KM-OP-002 HIGH** (~89%) |
| SLA | Medium risk, not breached |

## Orchestration highlights

- Demonstrates **orchestration tradeoff** — risk present but action prefers KM
- Escalation not eliminated, but not primary decision
- Explanation narrates “apply KM before N3”

## Screenshots checklist

- [ ] Step 02 — escalation Elevated, SLA Medium
- [ ] Step 03 — Apply KM procedure
- [ ] Step 04 — KM-OP-002 HIGH confidence
- [ ] Explanation — tradeoff reasoning paragraph

## Agent URL

**`/agent/tickets/6`** (`CARE-DEMO-00006`)
