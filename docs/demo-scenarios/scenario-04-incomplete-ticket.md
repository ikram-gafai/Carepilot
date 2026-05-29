# Scenario 04 — Incomplete ticket

## Objective

Demonstrate missing information detection, poor completeness, and request-for-information before routing.

## Ticket context

| Field | Value |
|-------|-------|
| CARE ID | `CARE-DEMO-00004` |
| Title | checkout not working |
| Description | checkout not working |
| Priority | P3 |

**Situation:** Store report with no lane, terminal, error code, or reproduction steps. Classic vague FO intake.

## Expected AI behavior

| Signal | Expected |
|--------|----------|
| Completeness | **~22%** |
| Quality | **Poor** |
| Missing fields | Vague description, generic title, store/lane/terminal IDs, error, reproduction |
| Action | **Request information** |
| KM | None |
| Escalation | Low / uncertain |

## Orchestration highlights

- Step 01 **open by default** — quality warnings visible
- Primary decision: **Request information**
- Step 04 empty — cannot safely recommend KM
- Explanation **missing-info note** is prominent

## Screenshots checklist

- [ ] Step 01 — Poor quality + vague description border
- [ ] Sticky bar — Request information
- [ ] Step 05 — missing information note
- [ ] Risk section secondary (collapsed)

## Agent URL

**`/agent/tickets/4`** (`CARE-DEMO-00004`)
