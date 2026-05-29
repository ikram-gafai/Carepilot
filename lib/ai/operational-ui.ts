import type { OperationalQualityLevel } from "@/lib/ai/missing-information"
import { OPERATIONAL_SECTIONS as DS_SECTIONS } from "@/lib/ai/decision-support-terminology"
import { qualityBadgeClass } from "@/lib/ai/missing-display"
import { kmConfidenceClass } from "@/lib/ai/km-display"
import type { SignalSeverity } from "@/lib/ai/orchestration/types"
import { signalLevelLabel } from "@/lib/ai/signal-severity"
import { riskBadgeClass } from "@/lib/ai/sla-display"

/** Shared operational intelligence section titles (agent + admin). */
export const OPERATIONAL_SECTIONS = DS_SECTIONS

export function operationalSeverityLabel(severity: SignalSeverity): string {
  return signalLevelLabel(severity)
}

export function operationalSeverityDotClass(severity: SignalSeverity): string {
  switch (severity) {
    case "high":
      return "bg-destructive"
    case "medium":
      return "bg-amber-500"
    case "low":
      return "bg-emerald-600"
    default:
      return "bg-muted-foreground/40"
  }
}

export function operationalSeverityTextClass(severity: SignalSeverity): string {
  switch (severity) {
    case "high":
      return "text-destructive"
    case "medium":
      return "text-amber-700 dark:text-amber-400"
    case "low":
      return "text-emerald-700 dark:text-emerald-400"
    default:
      return "text-muted-foreground"
  }
}

export function operationalRiskLevelLabel(level: string): string {
  switch (level) {
    case "HIGH":
      return "Attention élevée"
    case "MEDIUM":
      return "Attention modérée"
    case "LOW":
      return "Attention standard"
    default:
      return level
  }
}

export function operationalRiskLevelClass(level: string): string {
  return riskBadgeClass(level)
}

export function operationalQualityClass(level: OperationalQualityLevel | string | null): string {
  return qualityBadgeClass((level ?? "POOR") as OperationalQualityLevel)
}

export function operationalKmConfidenceClass(level: string): string {
  return kmConfidenceClass(level)
}

export function formatOperationalConfidence(pct: number | null | undefined): string {
  if (pct == null) return "—"
  return `${pct}%`
}

export function formatOperationalConfidenceLabel(pct: number | null | undefined): string {
  if (pct == null) return "Confiance indisponible"
  return `Confiance ${pct} %`
}
