import { missingFieldLabel } from "@/lib/ai/missing-information"
import { baseDecisionFromLabel } from "@/lib/ai/orchestration/orchestrated-ticket-decision"
import type { OperationalIntelligencePayload, OperationalRiskSignal } from "@/lib/ai/orchestration/types"

export type OperationalExplanation = {
  operationalAssessment: string
  decisionRationale: string[]
  riskEvaluation: string
  requiredValidation: string | null
  recommendedHandling: string
  workflowStep: number
  workflowStepLabel: string
}

const MAX_BULLETS = 4

function matchesDecision(decision: string, base: string): boolean {
  const resolved = baseDecisionFromLabel(decision)
  return resolved === base
}

function signal(intelligence: OperationalIntelligencePayload, key: string): OperationalRiskSignal | undefined {
  return intelligence.operationalRisk.signals.find((s) => s.key === key)
}

function missingContextBullets(intelligence: OperationalIntelligencePayload): string[] {
  const { ticketQuality } = intelligence
  if (!ticketQuality.available || ticketQuality.missingFields.length === 0) return []
  return ticketQuality.missingFields.slice(0, MAX_BULLETS).map((field) => {
    const label = missingFieldLabel(field)
    return `${label.charAt(0).toLowerCase()}${label.slice(1)}`
  })
}

function dedupeBullets(bullets: string[]): string[] {
  const seen = new Set<string>()
  return bullets.filter((b) => {
    const k = b.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  }).slice(0, MAX_BULLETS)
}

function buildOperationalAssessment(intelligence: OperationalIntelligencePayload, decision: string): string {
  const orch = intelligence.orchestrated
  const km = intelligence.kmRecommendation.primary
  const incomplete = (intelligence.ticketQuality.missingFields.length ?? 0) > 0

  if (matchesDecision(decision, "REQUEST_INFORMATION")) {
    return incomplete
      ? "Ticket reçu en file FO avec contexte incident incomplet."
      : "Ticket file FO nécessitant des informations magasin complémentaires avant traitement."
  }
  if (matchesDecision(decision, "RESOLVE")) {
    return km
      ? `Incident périmètre FO — ${km.kmId} correspondante, appliquer la procédure puis clôturer.`
      : "Incident propriété FO avec parcours de remédiation validé."
  }
  if (matchesDecision(decision, "TRANSFER")) {
    return `Propriété hors périmètre FO${orch?.decisionTarget ? ` — router vers ${orch.decisionTarget}` : ""}.`
  }
  if (matchesDecision(decision, "ESCALATE_N3")) {
    return "Périmètre FO conserve la propriété — intervention spécialiste N3 requise."
  }
  if (matchesDecision(decision, "SUSPEND")) {
    return "Traitement FO bloqué en attente de confirmation magasin, logs ou dépendance externe."
  }
  return orch?.decisionReasoning ?? "Évaluation workflow opérationnel FO terminée."
}

function buildRiskEvaluation(intelligence: OperationalIntelligencePayload): string {
  const sla = signal(intelligence, "sla")
  const priority = signal(intelligence, "priority")
  if (intelligence.orchestrated?.slaAttention) {
    return `Exposition SLA active${sla?.value ? ` (${sla.value})` : ""} — prioriser le traitement.`
  }
  if (priority && (priority.severity === "high" || priority.severity === "medium")) {
    return `Priorité ${priority.value} — exposition opérationnelle magasin élevée.`
  }
  return "Exposition opérationnelle FO standard pour la priorité et le SLA actuels."
}

function rationaleForRequestInfo(intelligence: OperationalIntelligencePayload): string[] {
  return dedupeBullets([
    ...missingContextBullets(intelligence).map((b) => `${b} non fourni`),
    "Ticket incomplet — N1/N2 ne peut pas exécuter la KM ni clôturer en sécurité",
    "Le magasin doit fournir le contexte diagnostic manquant",
  ])
}

function rationaleForResolve(intelligence: OperationalIntelligencePayload): string[] {
  const km = intelligence.kmRecommendation.primary
  return dedupeBullets([
    km ? `${km.kmId} — ${km.title}` : "Parcours de remédiation disponible sur périmètre FO",
    "Le périmètre FO est propriétaire de l'incident",
    km ? "Appliquer la procédure, valider l'état magasin, puis clôturer" : "Valider la remédiation avant clôture",
    "Signaux d'escalade et de routage non dominants",
  ])
}

function rationaleForEscalate(intelligence: OperationalIntelligencePayload): string[] {
  const km = intelligence.kmRecommendation.primary
  const bullets = [
    "Périmètre FO conserve la propriété",
    km ? `${km.kmId} en échec ou insuffisante pour clôture` : "Aucune procédure de remédiation valide sur périmètre FO",
    "Diagnostics spécialiste N3 requis",
  ]
  return dedupeBullets(bullets)
}

function rationaleForTransfer(intelligence: OperationalIntelligencePayload): string[] {
  const target = intelligence.orchestrated?.decisionTarget
  return dedupeBullets([
    target ? `Périmètre propriétaire : ${target}` : "Incident hors propriété FO",
    "N1/N2 ne peut pas clôturer sur le périmètre actuel",
    "Signal de routage favorable au transfert périmètre",
  ])
}

function rationaleForSuspend(intelligence: OperationalIntelligencePayload): string[] {
  const bullets = missingContextBullets(intelligence)
  if (bullets.length === 0) bullets.push("En attente de confirmation magasin ou dépendance externe")
  bullets.push("Traitement en pause jusqu'à levée de la dépendance")
  return dedupeBullets(bullets)
}

function buildRequiredValidation(intelligence: OperationalIntelligencePayload, decision: string): string | null {
  const km = intelligence.kmRecommendation.primary
  if (matchesDecision(decision, "REQUEST_INFORMATION")) {
    const gaps = missingContextBullets(intelligence)
    return gaps.length > 0 ? `Obtenir du magasin : ${gaps.join(", ")}` : "Demander les détails incident manquants au magasin"
  }
  if (matchesDecision(decision, "RESOLVE") && km) {
    return `Exécuter ${km.kmId}, confirmer l'état opérationnel magasin, puis clôturer le ticket.`
  }
  if (matchesDecision(decision, "RESOLVE")) {
    return "Confirmer le résultat KM et valider avec le magasin avant clôture"
  }
  if (matchesDecision(decision, "TRANSFER")) {
    const target = intelligence.orchestrated?.decisionTarget
    return target ? `Transférer vers ${target} avec diagnostics et synthèse incident` : null
  }
  if (matchesDecision(decision, "ESCALATE_N3")) {
    return "Joindre diagnostics FO, logs et historique tentative KM pour N3"
  }
  if (matchesDecision(decision, "SUSPEND")) {
    return "Documenter la dépendance et planifier le suivi magasin"
  }
  return null
}

function buildRecommendedHandling(intelligence: OperationalIntelligencePayload, decision: string): string {
  const km = intelligence.kmRecommendation.primary
  const target = intelligence.orchestrated?.decisionTarget

  if (matchesDecision(decision, "REQUEST_INFORMATION")) {
    return "Demander terminal, erreur et reproduction au magasin, puis relancer l'analyse."
  }
  if (matchesDecision(decision, "RESOLVE") && km) {
    return `Appliquer ${km.kmId} sur périmètre FO, valider la remédiation avec le magasin, puis résoudre.`
  }
  if (matchesDecision(decision, "RESOLVE")) {
    return "Valider le résultat de remédiation avec le magasin et clôturer sur périmètre FO."
  }
  if (matchesDecision(decision, "TRANSFER") && target) {
    return `Transférer vers ${target} avec passation structurée et diagnostics collectés.`
  }
  if (matchesDecision(decision, "ESCALATE_N3")) {
    return "Escalader N3 avec contexte FO complet — même périmètre, niveau spécialiste."
  }
  if (matchesDecision(decision, "SUSPEND")) {
    return "Suspendre et relancer lorsque le magasin ou la dépendance externe répond."
  }
  return intelligence.orchestrated?.decisionReasoning ?? "Suivre l'action opérationnelle FO suggérée."
}

export function buildOperationalExplanation(
  intelligence: OperationalIntelligencePayload,
): OperationalExplanation | null {
  const decision =
    intelligence.recommendedAction.actionLabel ?? intelligence.orchestrated?.decisionLabel ?? null
  if (!decision) return null
  const base = baseDecisionFromLabel(decision)

  let decisionRationale: string[]
  switch (base) {
    case "REQUEST_INFORMATION":
      decisionRationale = rationaleForRequestInfo(intelligence)
      break
    case "RESOLVE":
      decisionRationale = rationaleForResolve(intelligence)
      break
    case "ESCALATE_N3":
      decisionRationale = rationaleForEscalate(intelligence)
      break
    case "TRANSFER":
      decisionRationale = rationaleForTransfer(intelligence)
      break
    case "SUSPEND":
      decisionRationale = rationaleForSuspend(intelligence)
      break
    default:
      decisionRationale = [intelligence.orchestrated?.decisionReasoning ?? "Décision workflow FO appliquée"]
  }

  return {
    operationalAssessment: buildOperationalAssessment(intelligence, decision),
    decisionRationale,
    riskEvaluation: buildRiskEvaluation(intelligence),
    requiredValidation: buildRequiredValidation(intelligence, decision),
    recommendedHandling: buildRecommendedHandling(intelligence, decision),
    workflowStep: intelligence.orchestrated?.workflowStep ?? 0,
    workflowStepLabel: intelligence.orchestrated?.workflowStepLabel ?? "Workflow opérationnel FO",
  }
}

export function buildOperationalExplanationLegacy(intelligence: OperationalIntelligencePayload) {
  const expl = buildOperationalExplanation(intelligence)
  if (!expl) return null
  return {
    situation: expl.operationalAssessment,
    impact: expl.riskEvaluation,
    whyThisDecision: expl.decisionRationale,
    nextStep: expl.recommendedHandling,
  }
}

export function buildOperationalNarrative(intelligence: OperationalIntelligencePayload) {
  return buildOperationalExplanationLegacy(intelligence)
}
