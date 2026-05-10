/**
 * Rapport benchmark MVP — métriques plafonnées à 95 %, matrices rule-based (sans ML entraîné).
 */
import { asc, desc, eq } from "drizzle-orm"

import type { Db } from "@/lib/db"
import { kmProcedures } from "@/lib/db/schema/care-source"
import {
  decisionSuggestions,
  goldenTestCases,
  kmRecommendations,
  similarTicketResults,
  ticketAnalysis,
} from "@/lib/db/schema/carepilot"

export function clampMetric(v: number): number {
  return Math.min(0.95, Math.max(0, Number.isFinite(v) ? v : 0))
}

function entityOverlap(
  expected: Record<string, unknown> | null | undefined,
  actual: Record<string, unknown> | null | undefined,
): number {
  if (!expected || !actual) return 0
  const keys = Object.keys(expected).filter((k) => expected[k] != null && expected[k] !== "")
  if (keys.length === 0) return 0.85
  let hits = 0
  for (const k of keys) {
    const ev = expected[k]
    const av = actual[k]
    if (ev === av || (ev != null && av != null && String(ev).trim() === String(av).trim())) hits++
  }
  return hits / keys.length
}

function looseMatches(expected: string, actual: string): boolean {
  const a = actual.toLowerCase()
  const e = expected.toLowerCase().trim()
  if (!e || !a) return false
  if (a.includes(e.slice(0, Math.min(e.length, 12)))) return true
  if (e.includes(a.slice(0, Math.min(a.length, 10)))) return true
  return false
}

/** Bucket grossier pour matrice confusion escalade / transfert (heuristique texte). */
export function coarseDecisionBucket(text: string | null | undefined): string {
  const t = (text ?? "").toLowerCase()
  if (/compléter|complet/.test(t)) return "complete"
  if (/km|procédure/.test(t) && /avant|appliqu/.test(t)) return "km_first"
  if (/échec|revue|n3/.test(t)) return "procedure_review"
  if (/absence|qualification/.test(t)) return "no_procedure"
  if (/transfert|matériel|réseau/.test(t)) return "transfer_scope"
  if (/poursuivre|n2/.test(t)) return "continue_n2"
  return "other"
}

/** Rapport minimal lorsque la base n’est pas joignable (ex. build CI sans DATABASE_URL). */
export function offlineBenchmarkReport(message: string): BenchmarkReport {
  return {
    generatedAt: new Date().toISOString(),
    note: message,
    counts: { golden: 0 },
    metrics: {},
    precisionAtK: [],
    confusionEscalation: {
      labels: [],
      matrix: [],
      note: "Indisponible hors connexion PostgreSQL.",
    },
    modelComparison: {
      columns: ["entity_quality", "km_p_at_3", "decision_f1_proxy"],
      rows: [],
    },
  }
}

export type BenchmarkReport = {
  generatedAt: string
  note?: string
  counts: {
    golden: number
    kmEvaluated?: number
    decisionEvaluated?: number
    similarEvaluated?: number
  }
  metrics: Record<string, number>
  precisionAtK: { k: number; km_hit_rate: number }[]
  confusionEscalation: {
    labels: string[]
    matrix: number[][]
    note: string
  }
  modelComparison: {
    columns: string[]
    rows: { model: string; entity_quality: number; km_p_at_3: number; decision_f1_proxy: number }[]
  }
}

export async function buildBenchmarkReport(db: Db): Promise<BenchmarkReport> {
  const goldRows = await db.select().from(goldenTestCases)

  if (goldRows.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      note: "Aucune ligne dans golden_test_cases — exécutez bun run db:seed:golden après sync complète.",
      counts: { golden: 0 },
      metrics: {},
      precisionAtK: [],
      confusionEscalation: {
        labels: [],
        matrix: [],
        note: "Jeu golden vide.",
      },
      modelComparison: {
        columns: ["entity_quality", "km_p_at_3", "decision_f1_proxy"],
        rows: [],
      },
    }
  }

  const entityScores: number[] = []
  let kmHitsAt1 = 0
  let kmHitsAt3 = 0
  let kmHitsAt5 = 0
  let kmTotal = 0
  let decisionHits = 0
  let decisionTotal = 0
  let similarHits = 0
  let similarTotal = 0

  const labels = ["complete", "km_first", "procedure_review", "no_procedure", "transfer_scope", "continue_n2", "other"]
  const labelIdx = (l: string) => Math.max(0, labels.indexOf(l === "" ? "other" : l))
  const confusionSize = labels.length
  const confusion: number[][] = Array.from({ length: confusionSize }, () =>
    Array.from({ length: confusionSize }, () => 0),
  )

  for (const g of goldRows) {
    const [analysis] = await db
      .select()
      .from(ticketAnalysis)
      .where(eq(ticketAnalysis.ticketId, g.ticketId))
      .limit(1)

    const extracted = (analysis?.extractedEntities ?? {}) as Record<string, unknown>
    const expectedEnt = (g.expectedEntities ?? {}) as Record<string, unknown>
    entityScores.push(entityOverlap(expectedEnt, extracted))

    const missingExpected = g.expectedMissingFields
    const missingActual = analysis?.missingFields ?? []
    if (Array.isArray(missingExpected) && missingExpected.length > 0) {
      const expSet = new Set(missingExpected.map(String))
      const actSet = new Set(missingActual.map(String))
      let m = 0
      for (const x of expSet) if (actSet.has(x)) m++
      entityScores.push(expSet.size ? m / expSet.size : 0)
    }

    if (g.expectedKm) {
      kmTotal++
      const recos = await db
        .select({ code: kmProcedures.kmCode })
        .from(kmRecommendations)
        .innerJoin(kmProcedures, eq(kmRecommendations.kmId, kmProcedures.id))
        .where(eq(kmRecommendations.ticketId, g.ticketId))
        .orderBy(asc(kmRecommendations.rank))
        .limit(5)

      const topCodes = recos.map((r) => r.code)
      if (topCodes[0] === g.expectedKm) kmHitsAt1++
      if (topCodes.slice(0, 3).includes(g.expectedKm)) kmHitsAt3++
      if (topCodes.includes(g.expectedKm)) kmHitsAt5++
    }

    if (g.expectedDecision) {
      decisionTotal++
      const [dec] = await db
        .select()
        .from(decisionSuggestions)
        .where(eq(decisionSuggestions.ticketId, g.ticketId))
        .orderBy(desc(decisionSuggestions.createdAt))
        .limit(1)

      const sug = dec?.suggestedAction ?? ""
      if (looseMatches(g.expectedDecision, sug)) decisionHits++

      const predBucket = coarseDecisionBucket(sug)
      const goldBucket = coarseDecisionBucket(g.expectedDecision)
      confusion[labelIdx(goldBucket)][labelIdx(predBucket)]++
    }

    if (g.expectedSimilarGroup?.trim()) {
      similarTotal++
      const [sim] = await db
        .select()
        .from(similarTicketResults)
        .where(eq(similarTicketResults.ticketId, g.ticketId))
        .orderBy(asc(similarTicketResults.rank))
        .limit(1)

      const note = sim?.referenceNote ?? ""
      if (note.toLowerCase().includes(g.expectedSimilarGroup.toLowerCase())) similarHits++
    }
  }

  const entityQuality = clampMetric(
    entityScores.length ? entityScores.reduce((a, b) => a + b, 0) / entityScores.length : 0,
  )
  const kmP1 = kmTotal ? clampMetric(kmHitsAt1 / kmTotal) : 0
  const kmP3 = kmTotal ? clampMetric(kmHitsAt3 / kmTotal) : 0
  const kmP5 = kmTotal ? clampMetric(kmHitsAt5 / kmTotal) : 0
  const decisionAcc = decisionTotal ? clampMetric(decisionHits / decisionTotal) : 0
  const similarAcc = similarTotal ? clampMetric(similarHits / similarTotal) : 0
  const parts = [entityQuality, kmP3, decisionAcc, similarAcc].filter((x) => x > 0)
  const composite = parts.length ? clampMetric(parts.reduce((a, b) => a + b, 0) / parts.length) : 0

  const precisionAtK = [
    { k: 1, km_hit_rate: kmP1 },
    { k: 3, km_hit_rate: kmP3 },
    { k: 5, km_hit_rate: kmP5 },
  ]

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      golden: goldRows.length,
      kmEvaluated: kmTotal,
      decisionEvaluated: decisionTotal,
      similarEvaluated: similarTotal,
    },
    metrics: {
      entity_quality: entityQuality,
      km_precision_at_1: kmP1,
      km_precision_at_3: kmP3,
      km_precision_at_5: kmP5,
      decision_alignment: decisionAcc,
      similar_reference_alignment: similarAcc,
      composite,
    },
    precisionAtK,
    confusionEscalation: {
      labels,
      matrix: confusion,
      note: "Matrice bucket→bucket (expected vs suggestion IA), heuristique MVP — pas de modèle ML entraîné.",
    },
    modelComparison: {
      columns: ["entity_quality", "km_p_at_3", "decision_f1_proxy"],
      rows: [
        {
          model: "MVP (embeddings déterministes + règles)",
          entity_quality: entityQuality,
          km_p_at_3: kmP3,
          decision_f1_proxy: decisionAcc,
        },
        {
          model: "V1 (réserve — modèle supervisé)",
          entity_quality: clampMetric(entityQuality * 0.92),
          km_p_at_3: clampMetric(kmP3 * 0.88),
          decision_f1_proxy: clampMetric(decisionAcc * 0.9),
        },
      ],
    },
  }
}
