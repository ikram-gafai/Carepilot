# Scenario 07 — Network vs payment ambiguity

## Objective

Demonstrate operational ambiguity when payment timeouts correlate with store network instability.

## Ticket context

| Field | Value |
|-------|-------|
| CARE ID | `CARE-DEMO-00007` |
| Store | Nantes Beaulieu hypermarket |
| Category | PAYMENT (symptom) |
| Network | VLAN 42 ping loss, DNS failures |
| Error | PAY-TMO-204 |

**Situation:** Lanes 2 and 5 payment timeout, but gateway and DNS issues on VLAN 42 since 09:50. Network likely root cause.

## Expected AI behavior

| Signal | Expected |
|--------|----------|
| Transfer | Required · ~84% |
| Action | **Transfer perimeter** (réseau) |
| Escalation | Lower than transfer |
| KM | Payment KM partial + **Network KM stronger** (rank 2 HIGH) |

## Orchestration highlights

- Category is PAYMENT but **transfer to network** recommended
- Two KM candidates show ambiguity resolution
- Explanation describes transfer/escalation tradeoff

## Screenshots checklist

- [ ] Step 02 — Transfer required
- [ ] Step 04 — two KM alternatives (payment vs network)
- [ ] Step 03 — Transfer perimeter
- [ ] Explanation — root cause reasoning

## Agent URL

**`/agent/tickets/7`** (`CARE-DEMO-00007`)
