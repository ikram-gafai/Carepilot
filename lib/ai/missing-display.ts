import type { MissingInformationField, OperationalQualityLevel } from "@/lib/ai/missing-information"
import { missingFieldLabel } from "@/lib/ai/missing-information"

export function formatCompletenessScore(score: number): string {
  return `${Math.round(score * 100)} %`
}

export function formatQualityLevel(level: OperationalQualityLevel): string {
  switch (level) {
    case "COMPLETE":
      return "Complet"
    case "ADEQUATE":
      return "Adéquat"
    case "INCOMPLETE":
      return "Incomplet"
    case "POOR":
      return "Insuffisant"
    default:
      return level
  }
}

export function qualityBadgeClass(level: OperationalQualityLevel): string {
  switch (level) {
    case "COMPLETE":
      return "text-emerald-700 dark:text-emerald-400"
    case "ADEQUATE":
      return "text-primary"
    case "INCOMPLETE":
      return "text-amber-700 dark:text-amber-400"
    case "POOR":
      return "text-destructive"
    default:
      return "text-muted-foreground"
  }
}

export function formatDetectionMethodLabel(method: string): string {
  if (method.includes("heuristics") || method.includes("rule_based")) return "Détecteur par règles v1"
  return method
}

export function formatMissingFieldWarnings(fields: MissingInformationField[]): string[] {
  return fields.map(missingFieldLabel)
}

export const MISSING_INFORMATION_SECTION_TITLE = "Complétude contexte"
