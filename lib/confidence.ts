export type ConfidenceBand = "high" | "medium" | "low"

/** Map a normalized score in [0,1] to an operational confidence band for UI. */
export function scoreToConfidenceBand(score: number): ConfidenceBand {
  if (score >= 0.78) return "high"
  if (score >= 0.55) return "medium"
  return "low"
}

export function confidenceBandLabel(band: ConfidenceBand): string {
  switch (band) {
    case "high":
      return "High confidence"
    case "medium":
      return "Medium confidence"
    case "low":
      return "Low confidence"
  }
}
