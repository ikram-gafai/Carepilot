import { NextResponse } from "next/server"

import { getMissingInformationForTicket } from "@/lib/ai/run-missing-information-analysis"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

type Params = { params: Promise<{ ticketId: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { ticketId: raw } = await params
    const ticketId = Number(raw)
    if (!Number.isFinite(ticketId)) return apiFail(400, "Invalid ticket id")

    const row = await getMissingInformationForTicket(ticketId)
    return NextResponse.json({ ok: true, row })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
