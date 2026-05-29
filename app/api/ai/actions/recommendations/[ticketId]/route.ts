import { NextResponse } from "next/server"

import { getActionRecommendationForTicket } from "@/lib/ai/run-action-recommendations"
import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getCarePilotSession } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ ticketId: string }> }

export async function GET(_req: Request, context: RouteContext) {
  try {
    const user = await getCarePilotSession()
    if (!user) return apiFail(401, "Authentication required")

    const { ticketId: ticketIdRaw } = await context.params
    const ticketId = Number(ticketIdRaw)
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return apiFail(400, "Invalid ticket id")
    }

    const row = await getActionRecommendationForTicket(ticketId)
    return NextResponse.json({ ok: true, row })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
