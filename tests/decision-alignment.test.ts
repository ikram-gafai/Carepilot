import { describe, expect, test } from "bun:test"

import {
  agentActionMatchesSuggestion,
  compareOperationalActionAlignment,
} from "@/lib/ai/decision-alignment"

describe("decision alignment", () => {
  test("matches identical transfer targets", () => {
    expect(
      agentActionMatchesSuggestion({
        suggestedDecision: "TRANSFER",
        suggestedTarget: "Infrastructure",
        agentEventType: "transfer_infrastructure",
      }),
    ).toBe(true)
  })

  test("flags different transfer targets as adjusted", () => {
    expect(
      compareOperationalActionAlignment({
        suggestedDecision: "TRANSFER",
        suggestedTarget: "Infrastructure",
        agentEventType: "transfer_materiel",
      }),
    ).toBe("overridden")
  })

  test("flags decision type changes as adjusted", () => {
    expect(
      compareOperationalActionAlignment({
        suggestedDecision: "TRANSFER",
        suggestedTarget: "Réseau",
        agentEventType: "escalate_n3",
      }),
    ).toBe("overridden")
  })

  test("matches identical resolve actions", () => {
    expect(
      agentActionMatchesSuggestion({
        suggestedDecision: "RESOLVE",
        suggestedTarget: null,
        agentEventType: "resolve",
      }),
    ).toBe(true)
  })

  test("flags resolve vs escalate as adjusted", () => {
    expect(
      compareOperationalActionAlignment({
        suggestedDecision: "RESOLVE",
        suggestedTarget: null,
        agentEventType: "escalate_n3",
      }),
    ).toBe("overridden")
  })
})
