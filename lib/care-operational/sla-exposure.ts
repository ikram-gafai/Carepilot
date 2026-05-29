/**
 * SLA exposure from synchronized CARE timestamps and priority TTR targets.
 * One bucket per open ticket — not ML predictions or stale sla_due_at alone.
 */

import { CLOSED_TICKET_STATUSES } from "@/lib/care-operational-actions"

export type SlaExposureBucket = "breached" | "at_risk" | "on_track"

/** Remaining SLA window at or below this fraction → At Risk (25% of TTR). */
export const SLA_AT_RISK_REMAINING_RATIO = 0.25

export const TTR_HOURS_BY_PRIORITY: Record<string, number> = {
  P1: 4,
  P2: 8,
  P3: 24,
  P4: 48,
  CRITICAL: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 48,
  critical: 4,
  high: 8,
  medium: 24,
  low: 48,
}

export type SlaExposureInput = {
  status: string
  priority?: string | null
  slaDueAt?: Date | null
  createdAt?: Date | null
  externalCreatedAt?: Date | null
  ttrTargetHours?: number | null
  now?: Date
}

export type SlaExposureResult = {
  bucket: SlaExposureBucket
  label: "Breached" | "At risk" | "On track" | "Not set" | "—"
  tone: "critical" | "warning" | "success" | "neutral"
  deadline: Date | null
  ttrHours: number | null
  remainingMs: number | null
}

const CLOSED = new Set<string>([...CLOSED_TICKET_STATUSES, "CLOSED"])

export function isOpenTicketStatus(status: string): boolean {
  return !CLOSED.has(status)
}

export function resolveTtrTargetHours(
  priority: string | null | undefined,
  ttrTargetHours?: number | null,
): number {
  if (ttrTargetHours != null && ttrTargetHours > 0) return ttrTargetHours
  const key = (priority ?? "P3").trim()
  return TTR_HOURS_BY_PRIORITY[key] ?? TTR_HOURS_BY_PRIORITY[key.toUpperCase()] ?? 24
}

export function resolveSlaAnchorCreatedAt(input: SlaExposureInput): Date | null {
  return input.externalCreatedAt ?? input.createdAt ?? null
}

/** SLA deadline = anchor created + TTR window (authoritative for open tickets). */
export function resolveSlaDeadline(input: SlaExposureInput): {
  deadline: Date | null
  ttrHours: number | null
  anchorCreatedAt: Date | null
} {
  if (!isOpenTicketStatus(input.status)) {
    return { deadline: null, ttrHours: null, anchorCreatedAt: null }
  }

  const anchorCreatedAt = resolveSlaAnchorCreatedAt(input)
  if (!anchorCreatedAt) {
    return { deadline: input.slaDueAt ?? null, ttrHours: null, anchorCreatedAt: null }
  }

  const ttrHours = resolveTtrTargetHours(input.priority, input.ttrTargetHours)
  const deadline = new Date(anchorCreatedAt.getTime() + ttrHours * 3600_000)
  return { deadline, ttrHours, anchorCreatedAt }
}

export function classifySlaExposure(input: SlaExposureInput): SlaExposureResult {
  if (!isOpenTicketStatus(input.status)) {
    return {
      bucket: "on_track",
      label: "—",
      tone: "neutral",
      deadline: null,
      ttrHours: null,
      remainingMs: null,
    }
  }

  const now = input.now ?? new Date()
  const { deadline, ttrHours, anchorCreatedAt } = resolveSlaDeadline(input)

  if (!deadline || !ttrHours || !anchorCreatedAt) {
    return {
      bucket: "on_track",
      label: "Not set",
      tone: "neutral",
      deadline: null,
      ttrHours: null,
      remainingMs: null,
    }
  }

  const remainingMs = deadline.getTime() - now.getTime()
  const windowMs = ttrHours * 3600_000
  const atRiskThresholdMs = windowMs * SLA_AT_RISK_REMAINING_RATIO

  if (remainingMs <= 0) {
    return {
      bucket: "breached",
      label: "Breached",
      tone: "critical",
      deadline,
      ttrHours,
      remainingMs,
    }
  }

  if (remainingMs <= atRiskThresholdMs) {
    return {
      bucket: "at_risk",
      label: "At risk",
      tone: "warning",
      deadline,
      ttrHours,
      remainingMs,
    }
  }

  return {
    bucket: "on_track",
    label: "On track",
    tone: "success",
    deadline,
    ttrHours,
    remainingMs,
  }
}

/** Deterministic demo distribution: ~10% breached, ~17% at risk, rest on track. */
export function slaExposureBucketForIndex(index: number, total: number): SlaExposureBucket {
  const breachedCount = Math.max(1, Math.round(total * 0.1))
  const atRiskCount = Math.max(1, Math.round(total * 0.17))
  if (index < breachedCount) return "breached"
  if (index < breachedCount + atRiskCount) return "at_risk"
  return "on_track"
}

/** Build synchronized CARE timestamps for a target SLA bucket. */
export function buildSlaTimingForBucket(
  priority: string,
  bucket: SlaExposureBucket,
  index = 0,
  now = Date.now(),
): {
  createdAt: Date
  updatedAt: Date
  slaDueAt: Date
  ttrTargetHours: number
} {
  const ttrTargetHours = resolveTtrTargetHours(priority)
  const windowMs = ttrTargetHours * 3600_000

  let elapsedFraction: number
  switch (bucket) {
    case "breached":
      elapsedFraction = 1.08 + (index % 5) * 0.05
      break
    case "at_risk":
      elapsedFraction = 0.78 + (index % 6) * 0.035
      break
    default:
      elapsedFraction = 0.15 + (index % 9) * 0.06
      break
  }

  const elapsedMs = Math.round(windowMs * elapsedFraction)
  const createdAt = new Date(now - elapsedMs)
  const updatedAt = new Date(createdAt.getTime() + 30 * 60_000)
  const slaDueAt = new Date(createdAt.getTime() + windowMs)

  return { createdAt, updatedAt, slaDueAt, ttrTargetHours }
}

export function countSlaExposureBuckets(
  rows: Array<{ bucket: SlaExposureBucket }>,
): Record<SlaExposureBucket, number> {
  return rows.reduce(
    (acc, row) => {
      acc[row.bucket] += 1
      return acc
    },
    { breached: 0, at_risk: 0, on_track: 0 },
  )
}
