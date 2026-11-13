import { describe, expect, test } from "bun:test"

import { buildDecisionSignals, suggestEscalationTransfer } from "../lib/rules/engine"

describe("suggestEscalationTransfer", () => {
  test("blocks when several fields are missing", () => {
    const out = suggestEscalationTransfer({
      appliedKmCode: null,
      kmApplicable: "KM-VLP-001",
      similarResolvedByN2: false,
      similarOftenEscalatedN3: false,
      hardwareHints: false,
      networkHints: false,
      missingFieldsCount: 3,
    })
    expect(out.suggestedAction).toContain("Complete")
    expect(out.blockingRules.length).toBeGreaterThan(0)
    expect(out.confidenceScore).toBeLessThanOrEqual(0.95)
  })

  test("KM available but not applied → avoid premature escalation", () => {
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

  test("KM applied + similar tickets often N3 → escalate to N3", () => {
    const out = suggestEscalationTransfer({
      appliedKmCode: "KM-X",
      kmApplicable: null,
      similarResolvedByN2: false,
      similarOftenEscalatedN3: true,
      hardwareHints: false,
      networkHints: false,
      missingFieldsCount: 0,
    })
    // Since 5303ff8 the engine returns the app-wide decision label (see lib/agent/investigation-timeline.ts).
    expect(out.suggestedAction).toBe("Escalate N3")
    expect(out.whyFactors).toContain("KM already applied")
    expect(out.whyFactors).toContain("Similar historical tickets often escalated to N3")
  })

  test("no KM and no obvious N2 resolution → stronger qualification", () => {
    const out = suggestEscalationTransfer({
      appliedKmCode: null,
      kmApplicable: null,
      similarResolvedByN2: false,
      similarOftenEscalatedN3: false,
      hardwareHints: false,
      networkHints: false,
      missingFieldsCount: 0,
    })
    expect(out.suggestedAction).toContain("procedure")
  })
})

describe("buildDecisionSignals", () => {
  test("infers hardware hints from analysis tags", () => {
    const input = buildDecisionSignals({
      appliedKmCode: null,
      kmApplicable: null,
      analysis: {
        extractedEntities: {},
        missingFields: [],
        operationalTags: ["Possible hardware"],
        detectedProblemType: null,
        detectedActions: [],
      },
      similarTicketsMeta: [{ finalAction: "Resolved N2" }],
    })
    expect(input.hardwareHints).toBe(true)
    expect(input.similarResolvedByN2).toBe(true)
  })
})
