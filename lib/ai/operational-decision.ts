/**
 * Décisions opérationnelles qu'un agent N1/N2 peut exécuter.
 * La KM est une étape procédurale — jamais une action suggérée finale.
 */

export type OperationalDecision =
  | "REQUEST_INFORMATION"
  | "SUSPEND"
  | "RESOLVE"
  | "ESCALATE_N3"
  | "TRANSFER"

export const OPERATIONAL_DECISION_LABELS: Record<OperationalDecision, string> = {
  REQUEST_INFORMATION: "Demander des informations",
  SUSPEND: "Suspendre",
  RESOLVE: "Résoudre",
  ESCALATE_N3: "Escalade N3",
  TRANSFER: "Transfert",
}

export const OPERATIONAL_DECISION_ORDER: OperationalDecision[] = [
  "RESOLVE",
  "ESCALATE_N3",
  "TRANSFER",
  "SUSPEND",
  "REQUEST_INFORMATION",
]

export type DecisionMappingHints = {
  escalationRequired?: boolean
  transferRequired?: boolean
  missingContext?: boolean
}

const INTERNAL_TO_DECISION: Record<string, OperationalDecision> = {
  RESOLVE_LOCALLY: "RESOLVE",
  APPLY_KM: "RESOLVE",
  ESCALATE_N3: "ESCALATE_N3",
  TRANSFER_PERIMETER: "TRANSFER",
  REQUEST_INFORMATION: "REQUEST_INFORMATION",
  MONITOR: "SUSPEND",
  resolve: "RESOLVE",
  escalate_n3: "ESCALATE_N3",
  suspend: "SUSPEND",
  request_information: "REQUEST_INFORMATION",
}

export function mapRecommendedActionToDecision(
  action: string | null | undefined,
): OperationalDecision | null {
  if (action) {
    if (INTERNAL_TO_DECISION[action]) return INTERNAL_TO_DECISION[action]
    const key = action.toUpperCase()
    if (INTERNAL_TO_DECISION[key]) return INTERNAL_TO_DECISION[key]
    if (action.startsWith("transfer_")) return "TRANSFER"
  }
  return null
}

export function mapAgentActionKindToDecision(
  kind: string | null | undefined,
): OperationalDecision | null {
  if (!kind) return null
  if (INTERNAL_TO_DECISION[kind]) return INTERNAL_TO_DECISION[kind]
  if (kind.startsWith("transfer_")) return "TRANSFER"
  return null
}

export function resolveEffectiveOperationalDecision(
  action: string | null | undefined,
  _hints?: DecisionMappingHints,
): OperationalDecision | null {
  return mapRecommendedActionToDecision(action)
}

export function formatOperationalDecision(
  decision: OperationalDecision | string | null | undefined,
): string {
  if (!decision) return "—"
  if (decision in OPERATIONAL_DECISION_LABELS) {
    return OPERATIONAL_DECISION_LABELS[decision as OperationalDecision]
  }
  return decision
}

export function formatRecommendedAsDecision(
  action: string | null | undefined,
  hints?: DecisionMappingHints,
): string {
  const decision = resolveEffectiveOperationalDecision(action, hints)
  return formatOperationalDecision(decision)
}

export function deriveOperationalDecisionReason(input: {
  recommendedAction: string
  title: string
  description: string
  priority: string
  escalationRequired?: boolean
  transferRequired?: boolean
}): string {
  const decision = resolveEffectiveOperationalDecision(input.recommendedAction, {
    escalationRequired: input.escalationRequired,
    transferRequired: input.transferRequired,
    missingContext: input.recommendedAction === "REQUEST_INFORMATION",
  })

  switch (decision) {
    case "REQUEST_INFORMATION":
      return "Demander les éléments manquants au magasin avant traitement."
    case "ESCALATE_N3":
      return "Intervention spécialiste N3 requise sur le périmètre FO actuel."
    case "TRANSFER":
      return "Router vers l'équipe périmètre propriétaire du périmètre incident."
    case "SUSPEND":
      return "Suspendre en attente de confirmation magasin, logs ou dépendance externe."
    case "RESOLVE":
    default:
      return "Clôturer sur le périmètre FO après application de la KM et validation de la remédiation."
  }
}

export function buildDecisionDistribution(
  items: Array<{ recommendedAction: string | null; hints?: DecisionMappingHints }>,
  options?: { mlOnly?: boolean },
): { decision: OperationalDecision; label: string; count: number }[] {
  const counts = new Map<OperationalDecision, number>()
  for (const item of items) {
    const decision = options?.mlOnly
      ? mapRecommendedActionToDecision(item.recommendedAction)
      : resolveEffectiveOperationalDecision(item.recommendedAction, item.hints)
    if (!decision) continue
    counts.set(decision, (counts.get(decision) ?? 0) + 1)
  }
  return OPERATIONAL_DECISION_ORDER.map((decision) => ({
    decision,
    label: formatOperationalDecision(decision),
    count: counts.get(decision) ?? 0,
  })).filter((r) => r.count > 0)
}

export function buildDecisionDistributionSorted(
  items: Array<{ recommendedAction: string | null; hints?: DecisionMappingHints }>,
  options?: { mlOnly?: boolean },
): { decision: OperationalDecision; label: string; count: number }[] {
  return [...buildDecisionDistribution(items, options)].sort((a, b) => b.count - a.count)
}

export function isLocalFoTreatmentDecision(decision: OperationalDecision): boolean {
  return decision === "RESOLVE"
}

export function isPendingHoldDecision(decision: OperationalDecision): boolean {
  return decision === "SUSPEND" || decision === "REQUEST_INFORMATION"
}
