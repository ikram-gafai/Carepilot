import { PRIORITY_MODEL_DISPLAY } from "@/lib/ai-phase"

export function formatPriorityModelLabel(modelVersion: string): string {
  if (modelVersion.includes("xgboost_priority")) return PRIORITY_MODEL_DISPLAY
  return modelVersion
}

export function formatConfidencePct(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function formatPredictedPriority(level: string): string {
  switch (level) {
    case "P1":
      return "P1 — Critique"
    case "P2":
      return "P2 — Élevée"
    case "P3":
      return "P3 — Moyenne"
    case "P4":
      return "P4 — Faible"
    default:
      return level
  }
}

export function priorityBadgeClass(level: string): string {
  switch (level) {
    case "P1":
      return "text-destructive"
    case "P2":
      return "text-amber-700 dark:text-amber-400"
    case "P3":
      return "text-primary"
    default:
      return "text-muted-foreground"
  }
}

export function isHighPredictedPriority(level: string): boolean {
  return level === "P1" || level === "P2"
}
