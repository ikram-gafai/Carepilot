import { eq } from "drizzle-orm"

import { apiFail, apiOk, parseBody, routeErrorMessage } from "@/lib/api/http"
import { getDb } from "@/lib/db"
import { carepilotTickets } from "@/lib/db/schema/carepilot"
import { appendTimelineEvent } from "@/lib/pipeline/timeline"
import { agentDecisionBodySchema } from "@/lib/schema/api"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Params) {
  try {
    const { id } = await ctx.params
    const ticketId = Number.parseInt(id, 10)
    if (Number.isNaN(ticketId)) {
      return apiFail(400, "Identifiant ticket invalide")
    }

    const parsed = await parseBody(agentDecisionBodySchema, req)
    if (!parsed.success) return parsed.response

    const db = getDb()

    await db
      .update(carepilotTickets)
      .set({
        agentFinalDecision: parsed.data.agentFinalDecision,
        agentFinalDecisionNotes: parsed.data.notes ?? null,
        agentFinalDecisionAt: new Date(),
      })
      .where(eq(carepilotTickets.id, ticketId))

    await appendTimelineEvent(db, {
      ticketId,
      eventType: "agent_override",
      summary: `Décision agent (override) : ${parsed.data.agentFinalDecision}`,
      detail: parsed.data.notes ?? "",
      occurredAt: new Date(),
    })

    return apiOk({ ticketId })
  } catch (e) {
    return apiFail(400, routeErrorMessage(e))
  }
}
