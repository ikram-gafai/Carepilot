import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getSynchronizedTicketHistory } from "@/lib/carepilot-api/tickets"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    const ticketId = Number(id)
    if (!Number.isFinite(ticketId)) return apiFail(400, "Invalid ticket id")
    const data = await getSynchronizedTicketHistory(ticketId)
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
