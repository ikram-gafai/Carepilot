import { NextResponse } from "next/server"

import { getEscalationPredictionForTicket } from "@/lib/ai/run-escalation-predictions"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

type RouteContext = { params: Promise<{ ticketId: string }> }

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { ticketId } = await context.params
    const id = Number(ticketId)
    if (!Number.isFinite(id)) return apiFail(400, "Invalid ticket id")

    const prediction = await getEscalationPredictionForTicket(id)
    if (!prediction) {
      return NextResponse.json({ ok: true, prediction: null })
    }

    return NextResponse.json({ ok: true, prediction })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
