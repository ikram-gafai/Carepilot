import { spawn } from "node:child_process"
import path from "node:path"

import {
  ACTION_MODEL_ARTIFACT,
  ACTION_MODEL_NAME,
  ACTION_MODEL_VERSION,
} from "@/lib/ai-phase"
import type { InferSelectModel } from "drizzle-orm"
import type { cpAgentTickets } from "@/lib/db/schema/cp-agent"

export type CpAgentTicketForActionPrediction = Pick<
  InferSelectModel<typeof cpAgentTickets>,
  | "id"
  | "title"
  | "description"
  | "perimeter"
  | "priority"
  | "category"
  | "slaDueAt"
  | "resolutionDate"
  | "externalCreatedAt"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "source"
  | "storeType"
>

export type ActionFeatureRow = {
  ticket_id: number
  title: string
  description: string
  perimeter: string
  priority: string
  sla_breached: number
  escalation_required: number
  transfer_required: number
  resolution_time_minutes: number | null
  incident_category: string
  ticket_source: string
  environment_type: string
}

export type ActionRecommendationResult = {
  ticketId: number
  modelName: string
  recommendedAction: string
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

function mapTicketSource(source: string | null | undefined): string {
  const normalized = (source ?? "care").toLowerCase()
  if (normalized.includes("care")) return "care portal"
  if (normalized.includes("monitor")) return "monitoring"
  if (normalized.includes("hotline")) return "store hotline"
  return "n1 intake"
}

function mapEnvironmentType(storeType: string | null | undefined): string {
  const normalized = (storeType ?? "").toLowerCase()
  if (normalized.includes("hyper")) return "production"
  if (normalized.includes("market")) return "store-prod"
  if (normalized.includes("pilot")) return "pilot-store"
  return "production"
}

/** Derive training-aligned features from a synchronized cp_agent ticket. */
export function buildActionFeatures(
  ticket: CpAgentTicketForActionPrediction,
  routingSignals?: { escalationRequired?: boolean; transferRequired?: boolean },
): ActionFeatureRow {
  const createdAt = ticket.externalCreatedAt ?? ticket.createdAt
  const now = new Date()
  const endAt = ticket.resolutionDate ?? (isClosedStatus(ticket.status) ? ticket.updatedAt ?? now : now)

  let slaBreached = 0
  if (ticket.slaDueAt) {
    slaBreached = endAt > ticket.slaDueAt ? 1 : 0
  }

  const resolutionTimeMinutes = isClosedStatus(ticket.status) || ticket.resolutionDate
    ? minutesBetween(createdAt, ticket.resolutionDate ?? endAt)
    : minutesBetween(createdAt, now)

  return {
    ticket_id: ticket.id,
    title: ticket.title ?? "",
    description: ticket.description ?? "",
    perimeter: ticket.perimeter ?? ticket.category ?? "unknown",
    priority: ticket.priority ?? "unknown",
    sla_breached: slaBreached,
    escalation_required: routingSignals?.escalationRequired ? 1 : 0,
    transfer_required: routingSignals?.transferRequired ? 1 : 0,
    resolution_time_minutes: resolutionTimeMinutes,
    incident_category: ticket.category ?? "unknown",
    ticket_source: mapTicketSource(ticket.source),
    environment_type: mapEnvironmentType(ticket.storeType),
  }
}

type PythonPredictionPayload = {
  ok: boolean
  error?: string
  predictions?: Array<{
    ticket_id: number
    recommended_action: string
    confidence_score: number
    probability_distribution: Record<string, number>
  }>
}

function resolveModelPaths() {
  const artifactPath = path.join(process.cwd(), ACTION_MODEL_ARTIFACT)
  const scriptPath = path.join(process.cwd(), "ml", "inference", "action_recommend_predict.py")
  return { artifactPath, scriptPath }
}

/** Load the trained XGBoost pipeline and score ticket feature rows. */
export async function predictActionBatch(
  tickets: CpAgentTicketForActionPrediction[],
  routingSignalsByTicketId?: Map<number, { escalationRequired: boolean; transferRequired: boolean }>,
): Promise<ActionRecommendationResult[]> {
  if (tickets.length === 0) return []

  const { artifactPath, scriptPath } = resolveModelPaths()
  const features = tickets.map((ticket) => {
    const routing = routingSignalsByTicketId?.get(ticket.id)
    return buildActionFeatures(ticket, routing)
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
    throw new Error(payload.error ?? "Action recommendation inference failed")
  }

  const byTicketId = new Map(payload.predictions.map((p) => [p.ticket_id, p]))

  return tickets.map((ticket) => {
    const prediction = byTicketId.get(ticket.id)
    if (!prediction) {
      throw new Error(`Missing prediction for ticket ${ticket.id}`)
    }
    return {
      ticketId: ticket.id,
      modelName: ACTION_MODEL_NAME,
      recommendedAction: prediction.recommended_action,
      confidenceScore: prediction.confidence_score,
      probabilityDistribution: prediction.probability_distribution,
      modelVersion: ACTION_MODEL_VERSION,
    }
  })
}
