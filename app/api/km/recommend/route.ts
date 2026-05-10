import { getDb } from "@/lib/db"
import { parseBody, apiFail, apiOk, routeErrorMessage } from "@/lib/api/http"
import { runAiPipelineForTicket } from "@/lib/pipeline/processTicket"
import { ticketIdBodySchema } from "@/lib/schema/api"

export async function POST(req: Request) {
  const parsed = await parseBody(ticketIdBodySchema, req)
  if (!parsed.success) return parsed.response

  try {
    const db = getDb()
    await runAiPipelineForTicket(db, parsed.data.ticketId)
    return apiOk({ ticketId: parsed.data.ticketId, stage: "km_recommend" as const })
  } catch (e) {
    return apiFail(400, routeErrorMessage(e))
  }
}
