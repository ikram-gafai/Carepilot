import type { HeuristicAnalysis } from "@/lib/analysis/heuristic"

export type DecisionInput = {
  appliedKmCode: string | null
  kmApplicable: string | null
  similarResolvedByN2: boolean
  similarOftenEscalatedN3: boolean
  hardwareHints: boolean
  networkHints: boolean
  missingFieldsCount: number
}

export type DecisionOutput = {
  suggestedAction: string
  reason: string
  whyFactors: string[]
  blockingRules: string[]
  confidenceScore: number
}

/**
 * Rule-based escalation & transfer assistance (MVP — no trained ML).
 */
export function suggestEscalationTransfer(input: DecisionInput): DecisionOutput {
  const blockingRules: string[] = []
  const whyFactors: string[] = []

  if (input.missingFieldsCount >= 2) {
    return {
      suggestedAction: "Complete the ticket",
      reason: "Critical information missing before escalation or transfer decision.",
      whyFactors: ["Several mandatory fields are empty"],
      blockingRules: ["Block: N3 escalation if store/lane data or error details are missing"],
      confidenceScore: 0.82,
    }
  }

  const kmExists =
    Boolean(input.kmApplicable?.trim()) || Boolean(input.appliedKmCode?.trim())

  if (kmExists && !input.appliedKmCode) {
    blockingRules.push("KM available but not applied — avoid premature N3 escalation")
    whyFactors.push("A KM procedure exists for this perimeter/category")
    return {
      suggestedAction: "Apply KM before escalation",
      reason:
        "Applicable KM should be attempted and documented before N3 escalation or hardware transfer.",
      whyFactors,
      blockingRules,
      confidenceScore: 0.79,
    }
  }

  if (input.appliedKmCode && input.similarOftenEscalatedN3) {
    whyFactors.push("KM already applied")
    whyFactors.push("Similar historical tickets often escalated to N3")
    return {
      suggestedAction: "Escalate N3",
      reason:
        "After KM was applied, comparable incidents still needed deeper analysis.",
      whyFactors,
      blockingRules,
      confidenceScore: 0.74,
    }
  }

  if (!kmExists && !input.similarResolvedByN2) {
    whyFactors.push("No clearly applicable KM in ticket metadata")
    whyFactors.push("No obvious N2 resolution from similar tickets")
    return {
      suggestedAction: "No procedure match — strengthen qualification",
      reason:
        "Situation poorly covered by known KM; qualify precisely before transfer or escalation.",
      whyFactors,
      blockingRules: [],
      confidenceScore: 0.71,
    }
  }

  if ((input.hardwareHints || input.networkHints) && input.appliedKmCode) {
    whyFactors.push("Hardware/network hints after KM")
    return {
      suggestedAction: "Transfer Hardware",
      reason:
        "After KM, symptoms point to infra/hardware rather than a purely application incident.",
      whyFactors,
      blockingRules: [],
      confidenceScore: 0.7,
    }
  }

  if (input.similarResolvedByN2 && !input.similarOftenEscalatedN3) {
    whyFactors.push("Similar tickets resolved at N2")
    return {
      suggestedAction: "Continue N2 resolution",
      reason:
        "Comparable incidents closed without premature escalation; leverage historical resolutions.",
      whyFactors,
      blockingRules: ["Watch for hardware transfers without documented handling"],
      confidenceScore: 0.77,
    }
  }

  return {
    suggestedAction: "Continue N2 analysis",
    reason: "No strong automatic transfer/escalation rule; decision left to the agent.",
    whyFactors: ["Context not discriminating enough for a strong recommendation"],
    blockingRules: [],
    confidenceScore: 0.62,
  }
}

export function buildDecisionSignals(args: {
  analysis: HeuristicAnalysis
  appliedKmCode: string | null
  kmApplicable: string | null
  similarTicketsMeta: Array<{ finalAction: string | null }>
}): DecisionInput {
  const texts = JSON.stringify(args.analysis).toLowerCase()
  const hardwareHints = /possible matériel|possible hardware|hardware|scanner|imprimante|printer/i.test(texts)
  const networkHints = /possible réseau|possible network|réseau|network|wifi|vlan/i.test(texts)

  const resolvedN2 = args.similarTicketsMeta.some((t) =>
    /\bn2\b|resolved|closed|résolu/i.test(t.finalAction ?? ""),
  )
  const escalatedN3 = args.similarTicketsMeta.filter((t) =>
    /\bn3\b|escalat/i.test(t.finalAction ?? ""),
  ).length

  return {
    appliedKmCode: args.appliedKmCode,
    kmApplicable: args.kmApplicable,
    similarResolvedByN2: resolvedN2,
    similarOftenEscalatedN3: escalatedN3 >= 2,
    hardwareHints,
    networkHints,
    missingFieldsCount: args.analysis.missingFields.length,
  }
}
