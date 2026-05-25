export type DemoSlaState = "breached" | "at-risk" | "on-track"

export type DemoTicketQueueRow = {
  ticketId: string
  subject: string
  perimeter: string
  slaState: DemoSlaState
  predictedOutcome: string
  confidence: number
  reason: string
  age: string
  lastUpdateLabel: string
}

/** Static demo rows for the tickets queue (UI reference). */
export const DEMO_TICKETS_QUEUE: DemoTicketQueueRow[] = [
  {
    ticketId: "INC-2025-0148",
    subject: "Printer not printing on lane 25",
    perimeter: "FO / VLP",
    slaState: "breached",
    predictedOutcome: "Continue N2 with KM",
    confidence: 82,
    reason:
      "Applicable KM found, N2 should apply the procedure, validate the result, then close if resolved.",
    age: "2d 4h",
    lastUpdateLabel: "15/05/2025 08:47",
  },
  {
    ticketId: "INC-2025-0147",
    subject: "SCO payment failure",
    perimeter: "SCO",
    slaState: "at-risk",
    predictedOutcome: "Transfer Network",
    confidence: 76,
    reason:
      "Network dependency detected. Payment issue outside lane POS perimeter.",
    age: "1d 7h",
    lastUpdateLabel: "15/05/2025 09:12",
  },
  {
    ticketId: "INC-2025-0146",
    subject: "Cash drawer not opening",
    perimeter: "FO / VLP",
    slaState: "at-risk",
    predictedOutcome: "Transfer Hardware",
    confidence: 77,
    reason:
      "Physical device replacement required after basic on-site checks.",
    age: "1d 2h",
    lastUpdateLabel: "15/05/2025 07:33",
  },
  {
    ticketId: "INC-2025-0145",
    subject: "Application freeze on login",
    perimeter: "APP",
    slaState: "on-track",
    predictedOutcome: "Continue N2 with KM",
    confidence: 81,
    reason: "Applicable KM found and similar tickets were resolved at N2.",
    age: "18h 11m",
    lastUpdateLabel: "15/05/2025 09:58",
  },
  {
    ticketId: "INC-2025-0144",
    subject: "Receipt not printing",
    perimeter: "FO / VLP",
    slaState: "on-track",
    predictedOutcome: "Escalate N3",
    confidence: 85,
    reason:
      "KM was already applied but the issue persists. Escalation reason: procedure failure.",
    age: "9h 32m",
    lastUpdateLabel: "15/05/2025 10:03",
  },
  {
    ticketId: "INC-2025-0143",
    subject: "Network disconnected",
    perimeter: "Network",
    slaState: "at-risk",
    predictedOutcome: "Escalate N3",
    confidence: 79,
    reason:
      "No exploitable KM found after diagnostic checks. Escalation reason: absence of procedure.",
    age: "1d 5h",
    lastUpdateLabel: "15/05/2025 06:21",
  },
]
