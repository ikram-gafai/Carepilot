import type { InferSelectModel } from "drizzle-orm"

import type { OperationalIntelligencePayload } from "@/lib/ai/orchestration/types"
import { cpAgentTicketHistory } from "@/lib/db/schema/cp-agent"

type HistoryRow = InferSelectModel<typeof cpAgentTicketHistory>

export type InvestigationTimelineEntry = {
  id: string
  label: string
  occurredAt: Date
  tone: "default" | "ai" | "sla" | "escalation" | "transfer" | "agent" | "km"
}

const HISTORY_LABELS: Record<string, { label: string; tone: InvestigationTimelineEntry["tone"] }> = {
  created: { label: "Ticket created", tone: "default" },
  ai_analysis: { label: "AI analysis generated", tone: "ai" },
  ai_recommendation: { label: "AI analysis generated", tone: "ai" },
  escalation_signal: { label: "Escalation suggested", tone: "escalation" },
  transfer_signal: { label: "Transfer suggested", tone: "transfer" },
  escalate_n3: { label: "Agent escalated to N3", tone: "escalation" },
  resolve: { label: "Resolution applied", tone: "agent" },
  suspend: { label: "Suspend applied", tone: "agent" },
  transfer_monetique: { label: "Transfer executed", tone: "transfer" },
  transfer_materiel: { label: "Transfer executed", tone: "transfer" },
  transfer_bo: { label: "Transfer executed", tone: "transfer" },
  transfer_reseau: { label: "Transfer executed", tone: "transfer" },
  transfer_bureautique: { label: "Transfer executed", tone: "transfer" },
  transfer_infrastructure: { label: "Transfer executed", tone: "transfer" },
  km_recommendation: { label: "KM identified", tone: "km" },
  agent_feedback: { label: "Agent feedback submitted", tone: "agent" },
}

function mapHistoryEvent(row: HistoryRow): InvestigationTimelineEntry {
  const mapped = HISTORY_LABELS[row.eventType] ?? {
    label: row.summary || row.eventType.replace(/_/g, " "),
    tone: "default" as const,
  }
  return {
    id: `hist-${row.id}`,
    label: mapped.label,
    occurredAt: row.occurredAt,
    tone: mapped.tone,
  }
}

function eventTime(iso: string | undefined, fallback: Date): Date {
  if (!iso) return fallback
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? fallback : d
}

export function buildInvestigationTimeline(input: {
  createdAt: Date
  history: HistoryRow[]
  intelligence: OperationalIntelligencePayload
  slaLabel: string
  generatedAt?: string
}): InvestigationTimelineEntry[] {
  const signalAt = eventTime(input.generatedAt, input.createdAt)
  const entries: InvestigationTimelineEntry[] = [
    {
      id: "created",
      label: "Ticket created",
      occurredAt: input.createdAt,
      tone: "default",
    },
  ]

  for (const row of input.history) {
    entries.push(mapHistoryEvent(row))
  }

  const { recommendedAction, kmRecommendation } = input.intelligence

  if (recommendedAction.available && !entries.some((e) => e.label === "AI analysis generated")) {
    entries.push({
      id: "ai-suggested",
      label: "AI analysis generated",
      occurredAt: signalAt,
      tone: "ai",
    })
  }

  if (input.slaLabel === "At risk" || input.slaLabel === "Breached") {
    entries.push({
      id: "sla-attention",
      label: "SLA attention detected",
      occurredAt: signalAt,
      tone: "sla",
    })
  }

  if (recommendedAction.actionLabel === "Escalate N3" && !entries.some((e) => e.label.includes("Escalation"))) {
    entries.push({
      id: "esc-suggest",
      label: "Escalation suggested",
      occurredAt: signalAt,
      tone: "escalation",
    })
  }

  if (recommendedAction.actionLabel === "Transfer" && !entries.some((e) => e.label.includes("Transfer"))) {
    entries.push({
      id: "trf-suggest",
      label: "Transfer suggested",
      occurredAt: signalAt,
      tone: "transfer",
    })
  }

  if (kmRecommendation.available && kmRecommendation.primary && !entries.some((e) => e.label === "KM identified")) {
    entries.push({
      id: "km-id",
      label: "KM identified",
      occurredAt: signalAt,
      tone: "km",
    })
  }

  const seen = new Set<string>()
  return entries
    .filter((e) => {
      const key = `${e.label}:${e.occurredAt.toISOString()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
}
