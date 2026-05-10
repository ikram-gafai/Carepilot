import { describe, expect, test } from "bun:test"

import { buildDecisionSignals, suggestEscalationTransfer } from "../lib/rules/engine"

describe("suggestEscalationTransfer", () => {
  test("bloque si plusieurs champs manquants", () => {
    const out = suggestEscalationTransfer({
      appliedKmCode: null,
      kmApplicable: "KM-VLP-001",
      similarResolvedByN2: false,
      similarOftenEscalatedN3: false,
      hardwareHints: false,
      networkHints: false,
      missingFieldsCount: 3,
    })
    expect(out.suggestedAction).toContain("Compléter")
    expect(out.blockingRules.length).toBeGreaterThan(0)
    expect(out.confidenceScore).toBeLessThanOrEqual(0.95)
  })

  test("KM disponible mais non appliquée → éviter escalade prématurée", () => {
    const out = suggestEscalationTransfer({
      appliedKmCode: null,
      kmApplicable: "KM-VLP-010",
      similarResolvedByN2: false,
      similarOftenEscalatedN3: false,
      hardwareHints: false,
      networkHints: false,
      missingFieldsCount: 0,
    })
    expect(out.suggestedAction).toContain("KM")
    expect(out.blockingRules.some((b) => b.includes("KM"))).toBe(true)
  })

  test("KM appliquée + incidents similaires souvent N3 → revue", () => {
    const out = suggestEscalationTransfer({
      appliedKmCode: "KM-X",
      kmApplicable: null,
      similarResolvedByN2: false,
      similarOftenEscalatedN3: true,
      hardwareHints: false,
      networkHints: false,
      missingFieldsCount: 0,
    })
    expect(out.suggestedAction.toLowerCase()).toMatch(/revue|échec/)
  })

  test("sans KM ni résolution N2 évidente → qualification renforcée", () => {
    const out = suggestEscalationTransfer({
      appliedKmCode: null,
      kmApplicable: null,
      similarResolvedByN2: false,
      similarOftenEscalatedN3: false,
      hardwareHints: false,
      networkHints: false,
      missingFieldsCount: 0,
    })
    expect(out.suggestedAction).toContain("Absence")
  })
})

describe("buildDecisionSignals", () => {
  test("déduit indices matériel depuis les tags d’analyse", () => {
    const input = buildDecisionSignals({
      appliedKmCode: null,
      kmApplicable: null,
      analysis: {
        extractedEntities: {},
        missingFields: [],
        operationalTags: ["Possible matériel"],
        detectedProblemType: null,
        detectedActions: [],
      },
      similarTicketsMeta: [{ finalAction: "Resolved N2" }],
    })
    expect(input.hardwareHints).toBe(true)
    expect(input.similarResolvedByN2).toBe(true)
  })
})
