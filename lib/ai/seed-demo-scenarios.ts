import { eq } from "drizzle-orm"

import {
  buildSlaTimingForBucket,
  resolveTtrTargetHours,
  type SlaExposureBucket,
} from "@/lib/care-operational/sla-exposure"
import {
  cpAgentPriority,
  DEMO_SCENARIOS,
  perimeterForDemoScenario,
  type DemoScenarioDefinition,
} from "@/lib/care-operational/demo-scenarios"
import {
  ACTION_MODEL_NAME,
  ACTION_MODEL_VERSION,
  ESCALATION_MODEL_NAME,
  ESCALATION_MODEL_VERSION,
  KM_MODEL_NAME,
  LLM_EXPLANATION_MODEL_NAME,
  LLM_EXPLANATION_MODEL_VERSION,
  MISSING_INFORMATION_MODEL_VERSION,
  PRIORITY_MODEL_NAME,
  PRIORITY_MODEL_VERSION,
  SLA_MODEL_NAME,
  SLA_MODEL_VERSION,
  TRANSFER_MODEL_NAME,
  TRANSFER_MODEL_VERSION,
} from "@/lib/ai-phase"
import { getDb, getSql } from "@/lib/db"
import {
  careSourceTickets,
  stores,
  ticketActions,
  ticketComments,
} from "@/lib/db/schema/care-source"
import {
  cpAgentAiActionRecommendations,
  cpAgentAiEscalationPredictions,
  cpAgentAiKmRecommendations,
  cpAgentAiMissingInformationAnalysis,
  cpAgentAiOperationalExplanations,
  cpAgentAiPriorityPredictions,
  cpAgentAiSlaPredictions,
  cpAgentAiTransferPredictions,
  cpAgentTicketComments,
  cpAgentTicketHistory,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

export type DemoScenarioManifestEntry = {
  careId: string
  slug: string
  title: string
  ticketId: number
  agentUrl: string
  objective: string
}

export type SeedDemoScenariosResult = {
  scenariosSeeded: number
  manifest: DemoScenarioManifestEntry[]
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3600_000)
}

function demoSlaBucket(scenario: DemoScenarioDefinition): SlaExposureBucket {
  const priority = cpAgentPriority(scenario)
  const ttrHours = resolveTtrTargetHours(priority)
  if (scenario.slaHoursFromNow <= 0) return "breached"
  if (scenario.slaHoursFromNow <= ttrHours * 0.25) return "at_risk"
  return "on_track"
}

function demoSlaTiming(scenario: DemoScenarioDefinition, index: number) {
  const priority = cpAgentPriority(scenario)
  return buildSlaTimingForBucket(priority, demoSlaBucket(scenario), index)
}

async function upsertCareSourceTicket(
  scenario: DemoScenarioDefinition,
  storeId: number,
  storeCode: string,
  index: number,
): Promise<number> {
  const db = getDb()
  const timing = demoSlaTiming(scenario, index)
  const createdAt = timing.createdAt
  const updatedAt = timing.updatedAt
  const slaDueAt = timing.slaDueAt

  const [existing] = await db
    .select({ id: careSourceTickets.id })
    .from(careSourceTickets)
    .where(eq(careSourceTickets.careTicketId, scenario.careId))
    .limit(1)

  const values = {
    careTicketId: scenario.careId,
    reference: scenario.careId,
    title: scenario.title,
    description: scenario.description,
    perimeter: perimeterForDemoScenario(scenario),
    status: scenario.status,
    priority: scenario.priority,
    category: scenario.category,
    subCategory: scenario.subCategory,
    storeId,
    storeCode,
    assignedGroup: "Carrefour Support",
    assignedAgent: scenario.assignedAgent,
    syncBatch: 1 as const,
    escalationRequired: scenario.ai.escalation.required,
    transferRequired: scenario.ai.transfer.required,
    targetPerimeter: scenario.ai.transfer.required ? "BO" : null,
    kmApplicable: scenario.ai.km[0]?.kmId ?? null,
    aiRecommendedAction: scenario.ai.action.recommended,
    aiConfidence: scenario.ai.action.confidence,
    aiReason: scenario.ai.action.reason,
    aiStatus: "active",
    createdAt,
    updatedAt,
    slaDueAt,
    closedAt: null,
  }

  if (existing) {
    await db.update(careSourceTickets).set(values).where(eq(careSourceTickets.id, existing.id))
    await db.delete(ticketActions).where(eq(ticketActions.ticketId, existing.id))
    await db.delete(ticketComments).where(eq(ticketComments.ticketId, existing.id))
    const ticketId = existing.id
    await insertCareSourceActivity(ticketId, scenario, createdAt, updatedAt)
    return ticketId
  }

  const [row] = await db.insert(careSourceTickets).values(values).returning({ id: careSourceTickets.id })
  const ticketId = row!.id
  await insertCareSourceActivity(ticketId, scenario, createdAt, updatedAt)
  return ticketId
}

async function insertCareSourceActivity(
  ticketId: number,
  scenario: DemoScenarioDefinition,
  createdAt: Date,
  updatedAt: Date,
) {
  const db = getDb()
  await db.insert(ticketActions).values([
    {
      ticketId,
      actionType: "CREATED",
      description: `Demo scenario opened — ${scenario.slug}`,
      result: "OPEN",
      performedBy: "CARE_SYSTEM",
      createdAt,
    },
    {
      ticketId,
      actionType: "UPDATED",
      description: scenario.title,
      result: scenario.status,
      performedBy: scenario.assignedAgent,
      createdAt: updatedAt,
    },
  ])

  for (const [idx, comment] of scenario.comments.entries()) {
    await db.insert(ticketComments).values({
      ticketId,
      authorRole: comment.authorRole,
      content: comment.body,
      createdAt: hoursAgo(comment.hoursAgo),
    })
  }
}

async function upsertCpAgentTicket(
  scenario: DemoScenarioDefinition,
  externalId: string,
  store: {
    id: number
    storeCode: string
    storeName: string
    city: string
    region: string
    storeType: string
  },
  index: number,
): Promise<number> {
  const db = getDb()
  const now = new Date()
  const timing = demoSlaTiming(scenario, index)
  const createdAt = timing.createdAt
  const priority = cpAgentPriority(scenario)

  const values = {
    externalId,
    careId: scenario.careId,
    reference: scenario.careId,
    title: scenario.title,
    description: scenario.description,
    perimeter: perimeterForDemoScenario(scenario),
    storeId: store.id,
    storeCode: store.storeCode,
    storeName: store.storeName,
    storeCity: store.city,
    storeRegion: store.region,
    storeType: store.storeType,
    category: scenario.category,
    subCategory: scenario.subCategory,
    status: scenario.status,
    priority,
    assignedGroup: "Carrefour Support",
    assignedAgent: scenario.assignedAgent,
    slaDueAt: timing.slaDueAt,
    ttrTargetHours: timing.ttrTargetHours,
    externalCreatedAt: createdAt,
    externalUpdatedAt: now,
    lastSyncedAt: now,
    source: "CARE",
    aiRecommendedAction: scenario.ai.action.recommended,
    aiConfidence: scenario.ai.action.confidence,
    aiReason: scenario.ai.action.reason,
    aiStatus: "active",
    createdAt,
    updatedAt: now,
  }

  const [row] = await db
    .insert(cpAgentTickets)
    .values(values)
    .onConflictDoUpdate({
      target: cpAgentTickets.careId,
      set: values,
    })
    .returning({ id: cpAgentTickets.id })

  return row!.id
}

async function replaceCpAgentActivity(ticketId: number, scenario: DemoScenarioDefinition) {
  const db = getDb()
  const sql = getSql()
  await db.delete(cpAgentTicketComments).where(eq(cpAgentTicketComments.ticketId, ticketId))
  await db.delete(cpAgentTicketHistory).where(eq(cpAgentTicketHistory.ticketId, ticketId))

  for (const [idx, comment] of scenario.comments.entries()) {
    const at = hoursAgo(comment.hoursAgo)
    await db.insert(cpAgentTicketComments).values({
      ticketId,
      externalId: `${scenario.careId}-comment-${idx + 1}`,
      authorName: comment.authorName,
      authorRole: comment.authorRole,
      body: comment.body,
      externalCreatedAt: at,
      externalUpdatedAt: at,
      lastSyncedAt: new Date(),
    })
  }

  for (const [idx, event] of scenario.history.entries()) {
    const at = hoursAgo(event.hoursAgo)
    const externalId = `${scenario.careId}-hist-${idx + 1}`
    const syncedAt = new Date().toISOString()
    await sql`
      INSERT INTO cp_agent.ticket_history (
        ticket_id, external_id, event_type, summary, detail, actor_label, occurred_at, performed_at, last_synced_at, source
      ) VALUES (
        ${ticketId}, ${externalId}, ${event.eventType}, ${event.summary}, ${event.detail ?? null},
        ${event.actorLabel}, ${at.toISOString()}, ${at.toISOString()}, ${syncedAt}, 'CARE'
      )
    `
  }
}

async function upsertDemoAiOutputs(ticketId: number, scenario: DemoScenarioDefinition) {
  const db = getDb()
  const now = new Date()
  const ai = scenario.ai

  await db
    .insert(cpAgentAiEscalationPredictions)
    .values({
      ticketId,
      modelName: ESCALATION_MODEL_NAME,
      predictedEscalationRequired: ai.escalation.required,
      confidenceScore: ai.escalation.confidence,
      probabilityScore: ai.escalation.probability,
      predictionLabel: ai.escalation.label,
      modelVersion: ESCALATION_MODEL_VERSION,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiEscalationPredictions.ticketId,
      set: {
        predictedEscalationRequired: ai.escalation.required,
        confidenceScore: ai.escalation.confidence,
        probabilityScore: ai.escalation.probability,
        predictionLabel: ai.escalation.label,
        updatedAt: now,
      },
    })

  await db
    .insert(cpAgentAiTransferPredictions)
    .values({
      ticketId,
      modelName: TRANSFER_MODEL_NAME,
      predictedTransferRequired: ai.transfer.required,
      confidenceScore: ai.transfer.confidence,
      probabilityScore: ai.transfer.probability,
      predictionLabel: ai.transfer.label,
      modelVersion: TRANSFER_MODEL_VERSION,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiTransferPredictions.ticketId,
      set: {
        predictedTransferRequired: ai.transfer.required,
        confidenceScore: ai.transfer.confidence,
        probabilityScore: ai.transfer.probability,
        predictionLabel: ai.transfer.label,
        updatedAt: now,
      },
    })

  await db
    .insert(cpAgentAiActionRecommendations)
    .values({
      ticketId,
      modelName: ACTION_MODEL_NAME,
      recommendedAction: ai.action.recommended,
      confidenceScore: ai.action.confidence,
      probabilityDistribution: ai.action.distribution,
      modelVersion: ACTION_MODEL_VERSION,
      reason: ai.action.reason,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiActionRecommendations.ticketId,
      set: {
        recommendedAction: ai.action.recommended,
        confidenceScore: ai.action.confidence,
        probabilityDistribution: ai.action.distribution,
        reason: ai.action.reason,
        updatedAt: now,
      },
    })

  await db
    .insert(cpAgentAiSlaPredictions)
    .values({
      ticketId,
      modelName: SLA_MODEL_NAME,
      predictedSlaBreach: ai.sla.breach,
      probabilityScore: ai.sla.probability,
      confidenceScore: ai.sla.confidence,
      riskLevel: ai.sla.riskLevel,
      modelVersion: SLA_MODEL_VERSION,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiSlaPredictions.ticketId,
      set: {
        predictedSlaBreach: ai.sla.breach,
        probabilityScore: ai.sla.probability,
        confidenceScore: ai.sla.confidence,
        riskLevel: ai.sla.riskLevel,
        updatedAt: now,
      },
    })

  await db
    .insert(cpAgentAiPriorityPredictions)
    .values({
      ticketId,
      modelName: PRIORITY_MODEL_NAME,
      predictedPriority: ai.priority.predicted,
      confidenceScore: ai.priority.confidence,
      probabilityDistribution: ai.priority.distribution,
      modelVersion: PRIORITY_MODEL_VERSION,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiPriorityPredictions.ticketId,
      set: {
        predictedPriority: ai.priority.predicted,
        confidenceScore: ai.priority.confidence,
        probabilityDistribution: ai.priority.distribution,
        updatedAt: now,
      },
    })

  await db
    .insert(cpAgentAiMissingInformationAnalysis)
    .values({
      ticketId,
      missingFields: ai.missing.fields,
      completenessScore: ai.missing.completeness,
      qualityLevel: ai.missing.quality,
      confidenceScore: ai.missing.confidence,
      detectionMethod: "rule_based_v1",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiMissingInformationAnalysis.ticketId,
      set: {
        missingFields: ai.missing.fields,
        completenessScore: ai.missing.completeness,
        qualityLevel: ai.missing.quality,
        confidenceScore: ai.missing.confidence,
        updatedAt: now,
      },
    })

  await db.delete(cpAgentAiKmRecommendations).where(eq(cpAgentAiKmRecommendations.ticketId, ticketId))
  if (ai.km.length > 0) {
    await db.insert(cpAgentAiKmRecommendations).values(
      ai.km.map((km) => ({
        ticketId,
        kmId: km.kmId,
        kmTitle: km.title,
        methodName: KM_MODEL_NAME,
        similarityScore: km.similarity,
        rank: km.rank,
        confidenceLevel: km.confidenceLevel,
        reason: km.reason,
        updatedAt: now,
      })),
    )
  }

  const expl = ai.explanation
  await db
    .insert(cpAgentAiOperationalExplanations)
    .values({
      ticketId,
      modelName: LLM_EXPLANATION_MODEL_NAME,
      operationalSummary: expl.operationalSummary,
      recommendedActionExplanation: expl.recommendedActionExplanation,
      reasoning: expl.reasoning,
      missingInformationNote: expl.missingInformationNote,
      nextSteps: expl.nextSteps,
      latencyMs: 4200,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiOperationalExplanations.ticketId,
      set: {
        operationalSummary: expl.operationalSummary,
        recommendedActionExplanation: expl.recommendedActionExplanation,
        reasoning: expl.reasoning,
        missingInformationNote: expl.missingInformationNote,
        nextSteps: expl.nextSteps,
        updatedAt: now,
      },
    })
}

/** Seed 8 PFE demo scenarios into care_source + cp_agent with deterministic AI outputs. */
export async function seedDemoScenarios(): Promise<SeedDemoScenariosResult> {
  const db = getDb()
  const manifest: DemoScenarioManifestEntry[] = []

  const storeRows = await db
    .select({
      id: stores.id,
      storeCode: stores.storeCode,
      storeName: stores.storeName,
      city: stores.city,
      region: stores.region,
      storeType: stores.storeType,
    })
    .from(stores)

  if (storeRows.length === 0) {
    throw new Error("No stores found — run bun run db:seed:care-operational first.")
  }

  const storeByCode = new Map(storeRows.map((s) => [s.storeCode, s]))

  for (const [index, scenario] of DEMO_SCENARIOS.entries()) {
    const store = storeByCode.get(scenario.storeCode)
    if (!store) {
      throw new Error(`Store not found for demo scenario ${scenario.careId}: ${scenario.storeCode}`)
    }

    const externalId = `care-demo-${scenario.careId.toLowerCase()}`
    const careSourceId = await upsertCareSourceTicket(scenario, store.id, store.storeCode, index)
    const ticketId = await upsertCpAgentTicket(scenario, externalId, store, index)
    await replaceCpAgentActivity(ticketId, scenario)
    await upsertDemoAiOutputs(ticketId, scenario)

    manifest.push({
      careId: scenario.careId,
      slug: scenario.slug,
      title: scenario.title,
      ticketId,
      agentUrl: `/agent/tickets/${ticketId}`,
      objective: scenario.objective,
    })

    void careSourceId
  }

  return { scenariosSeeded: manifest.length, manifest }
}
