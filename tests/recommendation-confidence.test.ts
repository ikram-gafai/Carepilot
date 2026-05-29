import { describe, expect, it } from "bun:test"

import { calibrateRecommendationConfidencePct } from "@/lib/ai/recommendation-confidence"

describe("calibrateRecommendationConfidencePct", () => {
  it("returns high confidence for resolve with KM", () => {
    const pct = calibrateRecommendationConfidencePct({
      decision: "RESOLVE",
      careId: "CARE-OP-001",
      kmAvailable: true,
      kmId: "KM-FO-014",
      kmSimilarity: 0.82,
      qualityLevel: "GOOD",
    })
    expect(pct).toBeGreaterThanOrEqual(85)
    expect(pct).toBeLessThanOrEqual(95)
  })

  it("returns high confidence for transfer routing", () => {
    const pct = calibrateRecommendationConfidencePct({
      decision: "TRANSFER",
      careId: "CARE-OP-002",
      transferTarget: "Réseau",
      category: "NETWORK",
      transferSignal: true,
    })
    expect(pct).toBeGreaterThanOrEqual(80)
    expect(pct).toBeLessThanOrEqual(90)
  })

  it("returns medium confidence for missing context", () => {
    const pct = calibrateRecommendationConfidencePct({
      decision: "REQUEST_INFORMATION",
      careId: "CARE-OP-003",
      missingFieldsCount: 3,
      completenessScore: 0.4,
    })
    expect(pct).toBeGreaterThanOrEqual(60)
    expect(pct).toBeLessThanOrEqual(75)
  })

  it("is stable for the same ticket", () => {
    const input = {
      decision: "ESCALATE_N3" as const,
      careId: "CARE-OP-004",
      escalationSignal: true,
      kmAvailable: false,
    }
    expect(calibrateRecommendationConfidencePct(input)).toBe(
      calibrateRecommendationConfidencePct(input),
    )
  })
})
