import { NextResponse } from "next/server"

import { getPriorityPredictionForTicket } from "@/lib/ai/run-priority-predictions"
import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getCarePilotSession } from "@/lib/auth/session"

type Props = { params: Promise<{ ticketId: string }> }

export async function GET(_req: Request, { params }: Props) {
  try {
    const user = await getCarePilotSession()
    if (!user) return apiFail(401, "Authentication required")

    const { ticketId: rawId } = await params
    const ticketId = Number(rawId)
    if (!Number.isFinite(ticketId)) return apiFail(400, "Invalid ticket id")

    const row = await getPriorityPredictionForTicket(ticketId)
    return NextResponse.json({ ok: true, prediction: row })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
