/**
 * Workflow opérationnel FO — arbre de décision N1/N2 séquentiel.
 */

import type { OperationalDecision } from "@/lib/ai/operational-decision"
import {
  isFoVlpAgentScope,
  isLanePaymentScope,
  isOutsideFoVlpOwnership,
} from "@/lib/ai/orchestration/km-applicability"
import {
  hasSuspendInformationGaps,
  isWaitingWorkflowStatus,
} from "@/lib/ai/orchestration/missing-context-gate"
import type { CatalogOperationalPlan } from "@/lib/care-operational/catalog-operational-outcome"

export type FoWorkflowInput = {
  ticketStatus: string
  category: string | null
  perimeter: string | null
  qualityLevel?: string | null
  completenessScore?: number | null
  missingFields?: string[]
  hasKm: boolean
  hasResolvableKm: boolean
  catalogPlan?: CatalogOperationalPlan | null
}

export type FoWorkflowResult = {
  decision: OperationalDecision
  workflowStep: number
  stepLabel: string
}

export function isTicketInformationIncomplete(input: FoWorkflowInput): boolean {
  if (isWaitingWorkflowStatus(input.ticketStatus)) return false
  if (input.catalogPlan?.outcome === "SUSPEND") return false
  if (input.catalogPlan) return false

  const level = (input.qualityLevel ?? "").toUpperCase()
  if (level === "POOR" || level === "INCOMPLETE") return true
  if (input.completenessScore != null && input.completenessScore < 0.55) return true

  const fieldCount = input.missingFields?.length ?? 0
  if (fieldCount >= 6) return true

  if (hasSuspendInformationGaps(input.missingFields) && level !== "ADEQUATE" && level !== "COMPLETE") {
    return true
  }

  return false
}

function isFoTreatableScope(category: string | null, perimeter: string | null): boolean {
  return (
    isFoVlpAgentScope(category, perimeter) ||
    isLanePaymentScope(category) ||
    (category ?? "").toUpperCase() === "LOYALTY"
  )
}

function readyToResolve(input: FoWorkflowInput): boolean {
  const level = (input.qualityLevel ?? "").toUpperCase()
  if (level === "ADEQUATE" || level === "COMPLETE") return true
  return (input.completenessScore ?? 0) >= 0.72
}

function resolveFromCatalog(input: FoWorkflowInput, plan: CatalogOperationalPlan): FoWorkflowResult {
  const outside = isOutsideFoVlpOwnership(input.category)
  const inFo = isFoTreatableScope(input.category, input.perimeter)

  switch (plan.outcome) {
    case "REQUEST_INFORMATION":
      return { decision: "REQUEST_INFORMATION", workflowStep: 2, stepLabel: "Ticket incomplet — demander détails magasin" }
    case "SUSPEND":
      return { decision: "SUSPEND", workflowStep: 2, stepLabel: "En attente magasin ou dépendance externe" }
    case "TRANSFER":
      return { decision: "TRANSFER", workflowStep: 8, stepLabel: "Incident propriété d'un autre périmètre" }
    case "ESCALATE_N3":
      return { decision: "ESCALATE_N3", workflowStep: 9, stepLabel: "Périmètre FO — spécialiste requis" }
    case "RESOLVE":
      if (outside) {
        return { decision: "TRANSFER", workflowStep: 8, stepLabel: "Propriété hors périmètre FO/VLP" }
      }
      if (input.hasResolvableKm && input.hasKm) {
        const stepLabel = readyToResolve(input)
          ? "Parcours KM validé — prêt à clôturer"
          : "KM valide correspondante — appliquer la procédure avant clôture"
        return { decision: "RESOLVE", workflowStep: readyToResolve(input) ? 6 : 4, stepLabel }
      }
      return inFo
        ? { decision: "ESCALATE_N3", workflowStep: 9, stepLabel: "Sans KM — escalade FO" }
        : { decision: "TRANSFER", workflowStep: 8, stepLabel: "Sans KM — router vers périmètre propriétaire" }
  }
}

export function resolveFoWorkflowDecision(input: FoWorkflowInput): FoWorkflowResult {
  if (isWaitingWorkflowStatus(input.ticketStatus)) {
    return { decision: "SUSPEND", workflowStep: 2, stepLabel: "Traitement bloqué — attente dépendance" }
  }

  if (isTicketInformationIncomplete(input)) {
    if (input.catalogPlan?.outcome === "SUSPEND") {
      return { decision: "SUSPEND", workflowStep: 2, stepLabel: "Suspendre jusqu'à levée de la dépendance" }
    }
    return { decision: "REQUEST_INFORMATION", workflowStep: 2, stepLabel: "Ticket incomplet — demander détails magasin" }
  }

  if (input.catalogPlan) {
    return resolveFromCatalog(input, input.catalogPlan)
  }

  const outside = isOutsideFoVlpOwnership(input.category)
  const inFo = isFoTreatableScope(input.category, input.perimeter)

  if (outside) {
    return { decision: "TRANSFER", workflowStep: 8, stepLabel: "Mauvaise propriété périmètre" }
  }

  if (input.hasResolvableKm && input.hasKm) {
    const stepLabel = readyToResolve(input)
      ? "Parcours remédiation KM complet"
      : "KM valide correspondante — appliquer la procédure avant clôture"
    return { decision: "RESOLVE", workflowStep: readyToResolve(input) ? 6 : 4, stepLabel }
  }

  if (inFo) {
    return { decision: "ESCALATE_N3", workflowStep: 9, stepLabel: "Périmètre FO sans KM de remédiation" }
  }

  return { decision: "TRANSFER", workflowStep: 8, stepLabel: "Router vers périmètre propriétaire" }
}
