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
      suggestedAction: "Compléter le ticket",
      reason: "Informations critiques manquantes avant décision d’escalade ou de transfert.",
      whyFactors: ["Plusieurs champs obligatoires sont absents"],
      blockingRules: ["Blocage: escalade N3 si données magasin/caisse ou erreur manquantes"],
      confidenceScore: 0.82,
    }
  }

  const kmExists =
    Boolean(input.kmApplicable?.trim()) || Boolean(input.appliedKmCode?.trim())

  if (kmExists && !input.appliedKmCode) {
    blockingRules.push("KM disponible mais non appliquée — éviter escalade N3 prématurée")
    whyFactors.push("Une procédure KM existe pour ce périmètre/catégorie")
    return {
      suggestedAction: "Appliquer la KM avant escalade",
      reason:
        "La KM applicable doit être tentée et documentée avant une escalade N3 ou un transfert matériel.",
      whyFactors,
      blockingRules,
      confidenceScore: 0.79,
    }
  }

  if (input.appliedKmCode && input.similarOftenEscalatedN3) {
    whyFactors.push("KM déjà appliquée")
    whyFactors.push("Tickets historiques similaires souvent escaladés N3")
    return {
      suggestedAction: "Échec de procédure — revue N2/N3",
      reason:
        "Après application KM, les incidents comparables ont nécessité une analyse plus poussée.",
      whyFactors,
      blockingRules,
      confidenceScore: 0.74,
    }
  }

  if (!kmExists && !input.similarResolvedByN2) {
    whyFactors.push("Pas de KM manifestement applicable dans les métadonnées ticket")
    whyFactors.push("Pas de résolution N2 évidente via tickets similaires")
    return {
      suggestedAction: "Absence de procédure — qualification renforcée",
      reason:
        "Situation peu couverte par la KM connue ; qualifier précisément avant transfert ou escalade.",
      whyFactors,
      blockingRules: [],
      confidenceScore: 0.71,
    }
  }

  if ((input.hardwareHints || input.networkHints) && input.appliedKmCode) {
    whyFactors.push("Indices matériel/réseau après KM")
    return {
      suggestedAction: "Revoir transfert périmètre matériel/réseau",
      reason:
        "Après KM, les symptômes suggèrent un périmètre infra/matériel plutôt qu’un incident purement applicatif.",
      whyFactors,
      blockingRules: [],
      confidenceScore: 0.7,
    }
  }

  if (input.similarResolvedByN2 && !input.similarOftenEscalatedN3) {
    whyFactors.push("Tickets similaires résolus au niveau N2")
    return {
      suggestedAction: "Poursuivre résolution N2",
      reason:
        "Les incidents comparables se sont résolus sans escalade prématurée ; capitaliser sur les résolutions historiques.",
      whyFactors,
      blockingRules: ["Attention aux transferts matériel sans manipulation documentée"],
      confidenceScore: 0.77,
    }
  }

  return {
    suggestedAction: "Poursuivre analyse N2",
    reason: "Aucune règle forte de transfert ou d’escalade automatique ; décision laissée à l’agent.",
    whyFactors: ["Contexte insuffisamment discriminant pour une reco forte"],
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
  const hardwareHints = /possible matériel|hardware|scanner|imprimante/.test(texts)
  const networkHints = /possible réseau|réseau|wifi|vlan/.test(texts)

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
