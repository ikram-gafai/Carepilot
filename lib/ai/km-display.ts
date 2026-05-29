export function formatKmConfidence(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function formatKmMethodLabel(methodName: string): string {
  if (methodName.includes("Sentence")) return "Sentence Transformers · MiniLM"
  return methodName
}

export function formatKmConfidenceLevel(level: string): string {
  switch (level.toUpperCase()) {
    case "HIGH":
      return "Élevée"
    case "MEDIUM":
      return "Moyenne"
    case "LOW":
      return "Faible"
    default:
      return level
  }
}

export function kmConfidenceClass(level: string): string {
  switch (level) {
    case "HIGH":
      return "text-emerald-700 dark:text-emerald-400"
    case "MEDIUM":
      return "text-primary"
    default:
      return "text-muted-foreground"
  }
}
