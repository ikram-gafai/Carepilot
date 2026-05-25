import type { DemoSlaState, DemoTicketQueueRow } from "@/lib/tickets-demo-queue"
import { DEMO_TICKETS_QUEUE } from "@/lib/tickets-demo-queue"

export function findDemoQueueRowByRef(ref: string): DemoTicketQueueRow | null {
  const id = ref.trim()
  return DEMO_TICKETS_QUEUE.find((r) => r.ticketId === id) ?? null
}

/** Lane/register number from subject text (supports legacy French "caisse"). */
export function extractLaneFromSubject(subject: string): string | null {
  const m = subject.match(/\b(?:lane|caisse)\s*(\d+)/i)
  return m?.[1] ?? null
}

export function demoCategoryLabel(subject: string): string {
  const s = subject.toLowerCase()
  if (s.includes("printer") || s.includes("receipt") || s.includes("printing")) return "Printer"
  if (s.includes("sco") || s.includes("payment")) return "Payment"
  if (s.includes("network")) return "Network"
  if (s.includes("cash drawer")) return "Hardware"
  if (s.includes("login") || s.includes("application")) return "Application"
  return "General"
}

export function demoPriorityLabel(sla: DemoSlaState): "High" | "Medium" | "Low" {
  if (sla === "breached") return "High"
  if (sla === "at-risk") return "Medium"
  return "Low"
}

export type DemoTicketMetadataBar = {
  requester: string
  smac: string
  lane: string
  status: string
  sla: string
  lastUpdate: string
}

/** Static metadata bar tuned to the reference ticket; sensible fallbacks for other demo rows. */
export function demoMetadataBar(row: DemoTicketQueueRow): DemoTicketMetadataBar {
  const isRef = row.ticketId === "INC-2025-0148"
  const lane = extractLaneFromSubject(row.subject) ?? (isRef ? "25" : "—")
  let sla = "on track"
  if (row.slaState === "breached") sla = "breached by 42m"
  else if (row.slaState === "at-risk") sla = "at risk — window closing"

  return {
    requester: isRef ? "PERRET, Cath" : "—",
    smac: isRef ? "4821" : "—",
    lane,
    status: "In progress",
    sla,
    lastUpdate: row.lastUpdateLabel,
  }
}

export const DEMO_HISTORICAL_MATCHES = [
  {
    ticketId: "INC-2025-0084",
    outcome: "N2 handling completed successfully after KM execution.",
    similarity: 94,
  },
  {
    ticketId: "INC-2025-0091",
    outcome: "Same operational behavior and same perimeter.",
    similarity: 88,
  },
  {
    ticketId: "INC-2025-0108",
    outcome: "N3 escalation after failed operational validation.",
    similarity: 81,
  },
] as const

export const DEMO_ROUTING_STEPS = [
  {
    title: "Traitement N2",
    description: "Applicable KM identified and validated for N2 treatment.",
    current: true,
  },
  {
    title: "N3 escalation",
    description: "No operational KM available after diagnostic validation.",
    current: false,
  },
  {
    title: "N2 escalation",
    description: "Procedure failure detected after KM execution.",
    current: false,
  },
  {
    title: "Transfer out of perimeter",
    description: "Another operational perimeter has been identified.",
    current: false,
  },
] as const

export const DEMO_DIAGNOSTIC_ITEMS = [
  { label: "Error code / logs", state: "missing" as const },
  { label: "Reboot validation", state: "missing" as const },
]

export const DEMO_KM_MATCHES = [
  {
    title: "Printer not printing on POS",
    code: "KM-2023-1021",
    pct: 92,
  },
  {
    title: "SCO payment error codes guide",
    code: "KM-2023-0187",
    pct: 88,
  },
] as const
