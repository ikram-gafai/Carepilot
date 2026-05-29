import { spawn } from "node:child_process"
import path from "node:path"

import {
  ESCALATION_MODEL_ARTIFACT,
  ESCALATION_MODEL_NAME,
  ESCALATION_MODEL_VERSION,
} from "@/lib/ai-phase"
import type { InferSelectModel } from "drizzle-orm"
import type { cpAgentTickets } from "@/lib/db/schema/cp-agent"

export type CpAgentTicketForPrediction = Pick<
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
>

export type EscalationFeatureRow = {
  ticket_id: number
  title: string
  description: string
  perimeter: string
  priority: string
  sla_breached: number
  resolution_time_minutes: number | null
  incident_category: string
}

export type EscalationPredictionResult = {
  ticketId: number
  modelName: string
  predictedEscalationRequired: boolean
  confidenceScore: number
  probabilityScore: number
  predictionLabel: string
  modelVersion: string
}

const CLOSED_STATUSES = new Set(["RESOLVED", "CLOSED", "ESCALATED_N3"])

function isClosedStatus(status: string): boolean {
  return CLOSED_STATUSES.has(status) || status.startsWith("TRANSFERRED_")
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
}

/** Derive training-aligned features from a synchronized cp_agent ticket. */
export function buildEscalationFeatures(ticket: CpAgentTicketForPrediction): EscalationFeatureRow {
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
    resolution_time_minutes: resolutionTimeMinutes,
    incident_category: ticket.category ?? "unknown",
  }
}

type PythonPredictionPayload = {
  ok: boolean
  error?: string
  predictions?: Array<{
    ticket_id: number
    predicted_escalation_required: boolean
    confidence_score: number
    probability_score: number
    prediction_label: string
  }>
}

function resolveModelPaths() {
  const artifactPath = path.join(process.cwd(), ESCALATION_MODEL_ARTIFACT)
  const scriptPath = path.join(process.cwd(), "ml", "inference", "escalation_predict.py")
  return { artifactPath, scriptPath }
}

/** Load the trained XGBoost pipeline and score ticket feature rows. */
export async function predictEscalationBatch(
  tickets: CpAgentTicketForPrediction[],
): Promise<EscalationPredictionResult[]> {
  if (tickets.length === 0) return []

  const { artifactPath, scriptPath } = resolveModelPaths()
  const features = tickets.map(buildEscalationFeatures)

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
    throw new Error(payload.error ?? "Escalation inference failed")
  }

  const byTicketId = new Map(payload.predictions.map((p) => [p.ticket_id, p]))

  return tickets.map((ticket) => {
    const prediction = byTicketId.get(ticket.id)
    if (!prediction) {
      throw new Error(`Missing prediction for ticket ${ticket.id}`)
    }
    return {
      ticketId: ticket.id,
      modelName: ESCALATION_MODEL_NAME,
      predictedEscalationRequired: prediction.predicted_escalation_required,
      confidenceScore: prediction.confidence_score,
      probabilityScore: prediction.probability_score,
      predictionLabel: prediction.prediction_label,
      modelVersion: ESCALATION_MODEL_VERSION,
    }
  })
}
