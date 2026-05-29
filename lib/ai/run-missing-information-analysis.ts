import { and, count, desc, eq, inArray, sql } from "drizzle-orm"

import {
  MISSING_INFORMATION_ANALYSIS_ENABLED,
  MISSING_INFORMATION_MODEL_VERSION,
} from "@/lib/ai-phase"
import {
  analyzeMissingInformationBatch,
  normalizeMissingFields,
  type MissingInformationField,
  type OperationalQualityLevel,
} from "@/lib/ai/missing-information"
import { getDb } from "@/lib/db"
import {
  cpAgentAiMissingInformationAnalysis,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

export type MissingInformationStats = {
  totalAnalyses: number
  incompleteCount: number
  poorCount: number
  avgCompletenessPct: number
  topMissingFields: Array<{ field: string; count: number }>
}

export type MissingInformationRow = {
  id: number
  ticketId: number
  careId: string
  title: string
  storeCode: string | null
  storeName: string | null
  perimeter: string | null
  priority: string
  missingFields: MissingInformationField[]
  completenessScore: number
  qualityLevel: OperationalQualityLevel
  confidenceScore: number
  detectionMethod: string
  createdAt: Date
  updatedAt: Date
}

const CARE_FILTER = eq(cpAgentTickets.source, "CARE")

export async function getMissingInformationStats(): Promise<MissingInformationStats> {
  if (!MISSING_INFORMATION_ANALYSIS_ENABLED) {
    return { totalAnalyses: 0, incompleteCount: 0, poorCount: 0, avgCompletenessPct: 0, topMissingFields: [] }
  }

  const db = getDb()
  const [[totalRow], [incompleteRow], [poorRow], [avgRow], allFieldRows] = await Promise.all([
    db.select({ c: count() }).from(cpAgentAiMissingInformationAnalysis),
    db
      .select({ c: count() })
      .from(cpAgentAiMissingInformationAnalysis)
      .where(inArray(cpAgentAiMissingInformationAnalysis.qualityLevel, ["INCOMPLETE", "POOR"])),
    db
      .select({ c: count() })
      .from(cpAgentAiMissingInformationAnalysis)
      .where(eq(cpAgentAiMissingInformationAnalysis.qualityLevel, "POOR")),
    db
      .select({
        avg: sql<number>`coalesce(avg(${cpAgentAiMissingInformationAnalysis.completenessScore}), 0)`,
      })
      .from(cpAgentAiMissingInformationAnalysis),
    db
      .select({ missingFields: cpAgentAiMissingInformationAnalysis.missingFields })
      .from(cpAgentAiMissingInformationAnalysis),
  ])

  const fieldCounts = new Map<string, number>()
  for (const row of allFieldRows) {
    for (const field of row.missingFields ?? []) {
      fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1)
    }
  }
  const topMissingFields = [...fieldCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([field, c]) => ({ field, count: c }))

  return {
    totalAnalyses: Number(totalRow?.c ?? 0),
    incompleteCount: Number(incompleteRow?.c ?? 0),
    poorCount: Number(poorRow?.c ?? 0),
    avgCompletenessPct: Math.round(Number(avgRow?.avg ?? 0) * 100),
    topMissingFields,
  }
}

export async function listMissingInformationAnalyses(
  limit = 200,
  ticketIds?: number[],
): Promise<MissingInformationRow[]> {
  const db = getDb()
  const scope =
    ticketIds && ticketIds.length > 0
      ? and(CARE_FILTER, inArray(cpAgentAiMissingInformationAnalysis.ticketId, ticketIds))
      : CARE_FILTER
  const rows = await db
    .select({
      id: cpAgentAiMissingInformationAnalysis.id,
      ticketId: cpAgentAiMissingInformationAnalysis.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
      missingFields: cpAgentAiMissingInformationAnalysis.missingFields,
      completenessScore: cpAgentAiMissingInformationAnalysis.completenessScore,
      qualityLevel: cpAgentAiMissingInformationAnalysis.qualityLevel,
      confidenceScore: cpAgentAiMissingInformationAnalysis.confidenceScore,
      detectionMethod: cpAgentAiMissingInformationAnalysis.detectionMethod,
      createdAt: cpAgentAiMissingInformationAnalysis.createdAt,
      updatedAt: cpAgentAiMissingInformationAnalysis.updatedAt,
    })
    .from(cpAgentAiMissingInformationAnalysis)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiMissingInformationAnalysis.ticketId))
    .where(scope)
    .orderBy(cpAgentAiMissingInformationAnalysis.completenessScore)
    .limit(limit)

  return rows.map(mapMissingInformationRow)
}

function mapMissingInformationRow(row: {
  id: number
  ticketId: number
  careId: string
  title: string
  storeCode: string | null
  storeName: string | null
  perimeter: string | null
  priority: string
  missingFields: string[]
  completenessScore: number
  qualityLevel: string
  confidenceScore: number
  detectionMethod: string
  createdAt: Date
  updatedAt: Date
}): MissingInformationRow {
  return {
    ...row,
    missingFields: normalizeMissingFields(row.missingFields),
    qualityLevel: row.qualityLevel as OperationalQualityLevel,
  }
}

export async function getMissingInformationForTicket(ticketId: number): Promise<MissingInformationRow | null> {
  const db = getDb()
  const [row] = await db
    .select({
      id: cpAgentAiMissingInformationAnalysis.id,
      ticketId: cpAgentAiMissingInformationAnalysis.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
      missingFields: cpAgentAiMissingInformationAnalysis.missingFields,
      completenessScore: cpAgentAiMissingInformationAnalysis.completenessScore,
      qualityLevel: cpAgentAiMissingInformationAnalysis.qualityLevel,
      confidenceScore: cpAgentAiMissingInformationAnalysis.confidenceScore,
      detectionMethod: cpAgentAiMissingInformationAnalysis.detectionMethod,
      createdAt: cpAgentAiMissingInformationAnalysis.createdAt,
      updatedAt: cpAgentAiMissingInformationAnalysis.updatedAt,
    })
    .from(cpAgentAiMissingInformationAnalysis)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiMissingInformationAnalysis.ticketId))
    .where(and(eq(cpAgentAiMissingInformationAnalysis.ticketId, ticketId), CARE_FILTER)!)
    .limit(1)

  return row ? mapMissingInformationRow(row) : null
}

async function upsertMissingInformationAnalysis(
  result: Awaited<ReturnType<typeof analyzeMissingInformationBatch>>[number],
): Promise<void> {
  const db = getDb()
  const now = new Date()

  await db
    .insert(cpAgentAiMissingInformationAnalysis)
    .values({
      ticketId: result.ticketId,
      missingFields: result.missingFields,
      completenessScore: result.completenessScore,
      qualityLevel: result.qualityLevel,
      confidenceScore: result.confidenceScore,
      detectionMethod: result.detectionMethod,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiMissingInformationAnalysis.ticketId,
      set: {
        missingFields: result.missingFields,
        completenessScore: result.completenessScore,
        qualityLevel: result.qualityLevel,
        confidenceScore: result.confidenceScore,
        detectionMethod: result.detectionMethod,
        updatedAt: now,
      },
    })
}

export type RunMissingInformationAnalysisResult = {
  ticketsProcessed: number
  analysesWritten: number
  incompleteCount: number
  avgCompletenessPct: number
  modelVersion: string
  detectionMethod: string
}

export async function runMissingInformationAnalysis(opts?: {
  ticketIds?: number[]
}): Promise<RunMissingInformationAnalysisResult> {
  if (!MISSING_INFORMATION_ANALYSIS_ENABLED) {
    return {
      ticketsProcessed: 0,
      analysesWritten: 0,
      incompleteCount: 0,
      avgCompletenessPct: 0,
      modelVersion: MISSING_INFORMATION_MODEL_VERSION,
      detectionMethod: "disabled",
    }
  }

  const db = getDb()
  const tickets = await db
    .select({
      id: cpAgentTickets.id,
      title: cpAgentTickets.title,
      description: cpAgentTickets.description,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      category: cpAgentTickets.category,
    })
    .from(cpAgentTickets)
    .where(
      opts?.ticketIds?.length
        ? and(CARE_FILTER, inArray(cpAgentTickets.id, opts.ticketIds))!
        : CARE_FILTER,
    )

  if (tickets.length === 0) {
    return {
      ticketsProcessed: 0,
      analysesWritten: 0,
      incompleteCount: 0,
      avgCompletenessPct: 0,
      modelVersion: MISSING_INFORMATION_MODEL_VERSION,
      detectionMethod: "rule_based_v1",
    }
  }

  const batchSize = 50
  let analysesWritten = 0
  let incompleteCount = 0
  let completenessSum = 0

  for (let i = 0; i < tickets.length; i += batchSize) {
    const chunk = tickets.slice(i, i + batchSize)
    const results = analyzeMissingInformationBatch(chunk)
    for (const result of results) {
      await upsertMissingInformationAnalysis(result)
      analysesWritten++
      completenessSum += result.completenessScore
      if (result.qualityLevel === "INCOMPLETE" || result.qualityLevel === "POOR") {
        incompleteCount++
      }
    }
  }

  return {
    ticketsProcessed: tickets.length,
    analysesWritten,
    incompleteCount,
    avgCompletenessPct: analysesWritten ? Math.round((completenessSum / analysesWritten) * 100) : 0,
    modelVersion: MISSING_INFORMATION_MODEL_VERSION,
    detectionMethod: "rule_based_v1",
  }
}
