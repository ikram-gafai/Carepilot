import { spawn } from "node:child_process"
import path from "node:path"

import {
  KM_MODEL_ARTIFACT,
  KM_MODEL_NAME,
  KM_MODEL_VERSION,
} from "@/lib/ai-phase"
import type { InferSelectModel } from "drizzle-orm"
import type { cpAgentKmReferences, cpAgentTickets } from "@/lib/db/schema/cp-agent"

export type CpAgentTicketForKmRecommendation = Pick<
  InferSelectModel<typeof cpAgentTickets>,
  "id" | "title" | "description" | "perimeter" | "category"
>

export type KmCorpusRecord = Pick<
  InferSelectModel<typeof cpAgentKmReferences>,
  "code" | "title" | "perimeter" | "category" | "keywords" | "summary" | "procedureSteps"
> & { km_id?: string }

export type KmRecommendationResult = {
  ticketId: number
  kmId: string
  kmTitle: string
  similarityScore: number
  rank: number
  confidenceLevel: string
  reason: string
  methodName: string
  modelVersion: string
}

type PythonRecommendation = {
  ticket_id: number
  km_id: string
  km_title: string
  similarity_score: number
  rank: number
  confidence_level: string
  reason: string
}

function runPythonInference(payload: unknown): Promise<{ ok: boolean; results?: Array<{ ticket_id: number; recommendations: PythonRecommendation[] }>; error?: string }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "ml", "inference", "km_recommend.py")
    const child = spawn("python", [scriptPath, "--model", path.join(process.cwd(), KM_MODEL_ARTIFACT)], {
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk)
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `KM inference exited with code ${code}`))
        return
      }
      try {
        resolve(JSON.parse(stdout))
      } catch (e) {
        reject(new Error(`Invalid KM inference JSON: ${String(e)}`))
      }
    })
    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
  })
}

export function mapTicketToKmFeatures(ticket: CpAgentTicketForKmRecommendation) {
  return {
    ticket_id: ticket.id,
    title: ticket.title ?? "",
    description: ticket.description ?? "",
    perimeter: ticket.perimeter ?? "",
    incident_category: ticket.category ?? "",
  }
}

export function mapKmCorpusRecord(record: KmCorpusRecord) {
  return {
    km_id: record.km_id ?? record.code,
    code: record.code,
    title: record.title,
    perimeter: record.perimeter,
    incident_category: record.category,
    keywords: record.keywords ?? "",
    procedure_steps: record.procedureSteps ?? record.summary ?? "",
    summary: record.summary ?? "",
  }
}

export async function recommendKmBatch(
  tickets: CpAgentTicketForKmRecommendation[],
  kmRecords: KmCorpusRecord[],
): Promise<KmRecommendationResult[]> {
  if (tickets.length === 0 || kmRecords.length === 0) return []

  const response = await runPythonInference({
    tickets: tickets.map(mapTicketToKmFeatures),
    km_records: kmRecords.map(mapKmCorpusRecord),
  })

  if (!response.ok || !response.results) {
    throw new Error(response.error ?? "KM inference failed")
  }

  const output: KmRecommendationResult[] = []
  for (const row of response.results) {
    for (const rec of row.recommendations ?? []) {
      output.push({
        ticketId: row.ticket_id,
        kmId: rec.km_id,
        kmTitle: rec.km_title,
        similarityScore: rec.similarity_score,
        rank: rec.rank,
        confidenceLevel: rec.confidence_level,
        reason: rec.reason,
        methodName: KM_MODEL_NAME,
        modelVersion: KM_MODEL_VERSION,
      })
    }
  }
  return output
}
