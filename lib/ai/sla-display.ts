import { SLA_MODEL_DISPLAY } from "@/lib/ai-phase"

export function formatSlaModelLabel(modelVersion: string): string {
  if (modelVersion.includes("xgboost_sla")) return SLA_MODEL_DISPLAY
  return modelVersion
}

export function formatConfidencePct(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function formatRiskLevel(level: string): string {
  switch (level) {
    case "HIGH":
      return "Risque élevé"
    case "MEDIUM":
      return "Risque moyen"
    case "LOW":
      return "Risque faible"
    default:
      return level
  }
}

export function riskBadgeClass(level: string): string {
  switch (level) {
    case "HIGH":
      return "text-destructive"
    case "MEDIUM":
      return "text-amber-700 dark:text-amber-400"
    default:
      return "text-emerald-700 dark:text-emerald-400"
  }
}
