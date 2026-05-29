import { NextResponse } from "next/server"

import { getOperationalExplanationForTicket } from "@/lib/ai/run-llm-explanations"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const ticketId = Number((await params).ticketId)
    if (!Number.isFinite(ticketId)) return apiFail(400, "Invalid ticket id")

    const row = await getOperationalExplanationForTicket(ticketId)
    return NextResponse.json({ ok: true, row })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
