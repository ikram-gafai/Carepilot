import { spawn } from "node:child_process"
import path from "node:path"

import {
  PRIORITY_MODEL_ARTIFACT,
  PRIORITY_MODEL_NAME,
  PRIORITY_MODEL_VERSION,
} from "@/lib/ai-phase"
import type { InferSelectModel } from "drizzle-orm"
import type { cpAgentTickets } from "@/lib/db/schema/cp-agent"

export type CpAgentTicketForPriorityPrediction = Pick<
  InferSelectModel<typeof cpAgentTickets>,
  | "id"
  | "title"
  | "description"
  | "perimeter"
  | "category"
  | "slaDueAt"
  | "resolutionDate"
  | "externalCreatedAt"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "storeType"
  | "storeCode"
  | "storeRegion"
>

export type PriorityFeatureRow = {
  ticket_id: number
  title: string
  description: string
  perimeter: string
  incident_category: string
  store_size: string
  queue_load: number
  escalation_required: number
  transfer_required: number
  sla_breached: number
  recommended_action: string
  ticket_age_minutes: number
  environment_type: string
  operational_complexity: number
}

export type PriorityPredictionResult = {
  ticketId: number
  modelName: string
  predictedPriority: string
  confidenceScore: number
  probabilityDistribution: Record<string, number>
  modelVersion: string
}

const CLOSED_STATUSES = new Set(["RESOLVED", "CLOSED", "ESCALATED_N3"])

function isClosedStatus(status: string): boolean {
  return CLOSED_STATUSES.has(status) || status.startsWith("TRANSFERRED_")
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
}

function mapStoreSize(storeType: string | null | undefined): string {
  const normalized = (storeType ?? "").toLowerCase()
  if (normalized.includes("hyper")) return "hyper"
  if (normalized.includes("market")) return "market"
  if (normalized.includes("city")) return "city"
  if (normalized.includes("contact")) return "contact"
  return "market"
}

function deriveQueueLoad(ticket: CpAgentTicketForPriorityPrediction): number {
  const createdAt = ticket.externalCreatedAt ?? ticket.createdAt
  const hour = createdAt.getHours()
  const peakBoost = hour >= 10 && hour <= 20 ? 0.14 : 0.04
  const storeBoost = mapStoreSize(ticket.storeType) === "hyper" ? 0.1 : 0.05
  const regionBoost = (ticket.storeRegion ?? "").includes("Île-de-France") ? 0.05 : 0
  const codeHash = (ticket.storeCode ?? "store").length % 7
  return Math.min(0.98, Math.max(0.08, 0.2 + peakBoost + storeBoost + regionBoost + codeHash * 0.015))
}

function deriveOperationalComplexity(signals: {
  escalationRequired?: boolean
  transferRequired?: boolean
  recommendedAction?: string
  slaBreached?: boolean
  missingDescription?: boolean
}): number {
  let score = 0.14
  if (signals.escalationRequired) score += 0.12
  if (signals.transferRequired) score += 0.1
  if (signals.recommendedAction === "ESCALATE_N3") score += 0.08
  if (signals.recommendedAction === "TRANSFER_PERIMETER") score += 0.07
  if (signals.recommendedAction === "REQUEST_INFORMATION") score += 0.09
  if (signals.slaBreached) score += 0.08
  if (signals.missingDescription) score += 0.1
  return Math.round(Math.min(1, score) * 100) / 100
}

export function buildPriorityFeatures(
  ticket: CpAgentTicketForPriorityPrediction,
  routingSignals?: {
    escalationRequired?: boolean
    transferRequired?: boolean
    recommendedAction?: string
    slaBreached?: boolean
  },
): PriorityFeatureRow {
  const createdAt = ticket.externalCreatedAt ?? ticket.createdAt
  const now = new Date()
  const endAt = ticket.resolutionDate ?? (isClosedStatus(ticket.status) ? ticket.updatedAt ?? now : now)
  const ticketAgeMinutes = minutesBetween(createdAt, isClosedStatus(ticket.status) ? endAt : now)
  const missingDescription = !(ticket.description ?? "").trim()

  let slaBreached = routingSignals?.slaBreached ? 1 : 0
  if (slaBreached === 0 && ticket.slaDueAt && endAt > ticket.slaDueAt) slaBreached = 1

  return {
    ticket_id: ticket.id,
    title: ticket.title ?? "",
    description: ticket.description ?? "",
    perimeter: ticket.perimeter ?? ticket.category ?? "unknown",
    incident_category: ticket.category ?? "unknown",
    store_size: mapStoreSize(ticket.storeType),
    queue_load: deriveQueueLoad(ticket),
    escalation_required: routingSignals?.escalationRequired ? 1 : 0,
    transfer_required: routingSignals?.transferRequired ? 1 : 0,
    sla_breached: slaBreached,
    recommended_action: routingSignals?.recommendedAction ?? "RESOLVE_LOCALLY",
    ticket_age_minutes: ticketAgeMinutes,
    environment_type: mapStoreSize(ticket.storeType) === "hyper" ? "production" : "store-prod",
    operational_complexity: deriveOperationalComplexity({
      escalationRequired: routingSignals?.escalationRequired,
      transferRequired: routingSignals?.transferRequired,
      recommendedAction: routingSignals?.recommendedAction,
      slaBreached: slaBreached === 1,
      missingDescription,
    }),
  }
}

type PythonPredictionPayload = {
  ok: boolean
  error?: string
  predictions?: Array<{
    ticket_id: number
    predicted_priority: string
    confidence_score: number
    probability_distribution: Record<string, number>
  }>
}

function resolveModelPaths() {
  const artifactPath = path.join(process.cwd(), PRIORITY_MODEL_ARTIFACT)
  const scriptPath = path.join(process.cwd(), "ml", "inference", "priority_predict.py")
  return { artifactPath, scriptPath }
}

export async function predictPriorityBatch(
  tickets: CpAgentTicketForPriorityPrediction[],
  routingSignalsByTicketId?: Map<
    number,
    {
      escalationRequired: boolean
      transferRequired: boolean
      recommendedAction: string
      slaBreached: boolean
    }
  >,
): Promise<PriorityPredictionResult[]> {
  if (tickets.length === 0) return []

  const { artifactPath, scriptPath } = resolveModelPaths()
  const features = tickets.map((ticket) => {
    const routing = routingSignalsByTicketId?.get(ticket.id)
    return buildPriorityFeatures(ticket, routing)
  })

  const payload = await new Promise<PythonPredictionPayload>((resolve, reject) => {
    const proc = spawn(
      process.env.PYTHON_PATH?.trim() || "python",
      [scriptPath, "--model", artifactPath],
      { stdio: ["pipe", "pipe", "pipe"] },
    )

    let stdout = ""
    let stderr = ""
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on("error", reject)
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python inference exited with code ${code}`))
        return
      }
      try {
        resolve(JSON.parse(stdout) as PythonPredictionPayload)
      } catch (e) {
        reject(new Error(`Invalid inference JSON: ${stderr || stdout || String(e)}`))
      }
    })

    proc.stdin.write(JSON.stringify({ tickets: features }))
    proc.stdin.end()
  })

  if (!payload.ok || !payload.predictions) {
    throw new Error(payload.error ?? "Priority inference failed")
  }

  const byTicketId = new Map(payload.predictions.map((p) => [p.ticket_id, p]))

  return tickets.map((ticket) => {
    const prediction = byTicketId.get(ticket.id)
    if (!prediction) {
      throw new Error(`Missing prediction for ticket ${ticket.id}`)
    }
    return {
      ticketId: ticket.id,
      modelName: PRIORITY_MODEL_NAME,
      predictedPriority: prediction.predicted_priority,
      confidenceScore: prediction.confidence_score,
      probabilityDistribution: prediction.probability_distribution,
      modelVersion: PRIORITY_MODEL_VERSION,
    }
  })
}
