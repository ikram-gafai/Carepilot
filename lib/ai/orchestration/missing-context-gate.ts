/**
 * Blocking missing context — treatment cannot proceed until store provides details.
 * Orchestration suspend is driven by waiting workflow status or catalog suspend scenarios.
 * Missing-field analysis informs quality signals but does not auto-suspend treatable tickets.
 */

import { normalizeMissingFields, type OperationalQualityLevel } from "@/lib/ai/missing-information"

const WAITING_STATUSES = new Set(["WAITING_STORE", "SUSPENDED", "PENDING_STORE"])

export function isWaitingWorkflowStatus(status: string | null | undefined): boolean {
  return WAITING_STATUSES.has((status ?? "").toUpperCase())
}

export function hasBlockingMissingContext(input: {
  ticketStatus?: string | null
  qualityLevel?: string | null
  completenessScore?: number | null
  missingFields?: string[]
}): boolean {
  return isWaitingWorkflowStatus(input.ticketStatus)
}

export function missingContextSeverity(input: {
  qualityLevel?: string | null
  missingFields?: string[]
}): "none" | "partial" | "blocking" {
  if (hasBlockingMissingContext(input)) return "blocking"
  const level = input.qualityLevel ?? ""
  if (level === "INCOMPLETE" || level === "POOR") return "partial"
  const fields = normalizeMissingFields(input.missingFields ?? [])
  if (fields.length > 0) return "partial"
  return "none"
}

/** Fields associated with catalog suspend scenarios (informational). */
export function hasSuspendInformationGaps(missingFields?: string[]): boolean {
  const fields = normalizeMissingFields(missingFields ?? [])
  const gapFields = new Set([
    "MISSING_TERMINAL_ID",
    "MISSING_STORE_IDENTIFIER",
    "MISSING_TROUBLESHOOTING_STEPS",
  ])
  return fields.some((f) => gapFields.has(f))
}

export type { OperationalQualityLevel }
