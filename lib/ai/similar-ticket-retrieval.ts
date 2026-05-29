import { spawn } from "node:child_process"
import path from "node:path"

import {
  SIMILAR_TICKET_MODEL_ARTIFACT,
  SIMILAR_TICKET_MODEL_NAME,
  SIMILAR_TICKET_MODEL_VERSION,
} from "@/lib/ai-phase"
import type { InferSelectModel } from "drizzle-orm"
import type { cpAgentTickets } from "@/lib/db/schema/cp-agent"

export type CpAgentTicketForSimilarRetrieval = Pick<
  InferSelectModel<typeof cpAgentTickets>,
  "id" | "title" | "description" | "perimeter" | "category" | "careId" | "aiRecommendedAction"
>

export type SimilarTicketCorpusRecord = {
  ticket_id: number
  care_id: string
  title: string
  description: string
  perimeter: string | null
  category: string
  ai_recommended_action: string | null
  linked_resolution: string | null
  linked_km_id: string | null
}

export type SimilarTicketResult = {
  ticketId: number
  similarTicketId: number
  similarCareId: string
  similarTitle: string
  similarityScore: number
  rank: number
  linkedResolution: string | null
  linkedAction: string | null
  linkedKmId: string | null
  retrievalMethod: string
  modelVersion: string
}

type PythonMatch = {
  ticket_id: number
  similar_ticket_id: number
  similar_care_id: string
  similar_title: string
  similarity_score: number
  rank: number
  linked_resolution: string | null
  linked_action: string | null
  linked_km_id: string | null
}

function runPythonInference(payload: unknown): Promise<{
  ok: boolean
  results?: Array<{ ticket_id: number; matches: PythonMatch[] }>
  error?: string
}> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "ml", "inference", "similar_tickets_recommend.py")
    const child = spawn(
      "python",
      [scriptPath, "--model", path.join(process.cwd(), SIMILAR_TICKET_MODEL_ARTIFACT)],
      { stdio: ["pipe", "pipe", "pipe"] },
    )
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
        reject(new Error(stderr || stdout || `Similar ticket inference exited with code ${code}`))
        return
      }
      try {
        resolve(JSON.parse(stdout))
      } catch (e) {
        reject(new Error(`Invalid similar ticket inference JSON: ${String(e)}`))
      }
    })
    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
  })
}

export function mapTicketToSimilarFeatures(ticket: CpAgentTicketForSimilarRetrieval) {
  return {
    ticket_id: ticket.id,
    title: ticket.title ?? "",
    description: ticket.description ?? "",
    perimeter: ticket.perimeter ?? "",
    incident_category: ticket.category ?? "",
  }
}

export function mapCorpusRecord(row: SimilarTicketCorpusRecord) {
  return {
    ticket_id: row.ticket_id,
    care_id: row.care_id,
    title: row.title,
    description: row.description,
    perimeter: row.perimeter ?? "",
    incident_category: row.category,
    ai_recommended_action: row.ai_recommended_action,
    linked_resolution: row.linked_resolution,
    linked_km_id: row.linked_km_id,
  }
}

export async function recommendSimilarTicketsBatch(
  queries: CpAgentTicketForSimilarRetrieval[],
  corpus: SimilarTicketCorpusRecord[],
): Promise<SimilarTicketResult[]> {
  if (queries.length === 0 || corpus.length === 0) return []

  const response = await runPythonInference({
    tickets: queries.map(mapTicketToSimilarFeatures),
    corpus: corpus.map(mapCorpusRecord),
  })

  if (!response.ok || !response.results) {
    throw new Error(response.error ?? "Similar ticket inference failed")
  }

  const out: SimilarTicketResult[] = []
  for (const item of response.results) {
    for (const match of item.matches ?? []) {
      out.push({
        ticketId: item.ticket_id,
        similarTicketId: match.similar_ticket_id,
        similarCareId: match.similar_care_id,
        similarTitle: match.similar_title,
        similarityScore: match.similarity_score,
        rank: match.rank,
        linkedResolution: match.linked_resolution,
        linkedAction: match.linked_action,
        linkedKmId: match.linked_km_id,
        retrievalMethod: SIMILAR_TICKET_MODEL_NAME,
        modelVersion: SIMILAR_TICKET_MODEL_VERSION,
      })
    }
  }
  return out
}
