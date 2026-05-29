import { NextResponse } from "next/server"

import { getSimilarTicketsForTicket } from "@/lib/ai/run-similar-ticket-retrieval"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

type Params = { params: Promise<{ ticketId: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { ticketId } = await params
    const id = Number(ticketId)
    if (!Number.isFinite(id)) return apiFail(400, "Invalid ticket id")
    const rows = await getSimilarTicketsForTicket(id)
    return NextResponse.json({ ok: true, rows })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
