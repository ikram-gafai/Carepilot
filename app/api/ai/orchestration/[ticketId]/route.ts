import { NextResponse } from "next/server"

import { getOperationalIntelligenceForTicket } from "@/lib/ai/orchestration/operational-intelligence-orchestrator"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

type RouteContext = { params: Promise<{ ticketId: string }> }

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { ticketId } = await context.params
    const id = Number(ticketId)
    if (!Number.isFinite(id)) return apiFail(400, "Invalid ticket id")

    const intelligence = await getOperationalIntelligenceForTicket(id)
    if (!intelligence) return apiFail(404, "Ticket not found")

    return NextResponse.json({ ok: true, intelligence })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
