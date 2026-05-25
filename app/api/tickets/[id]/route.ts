import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getSynchronizedTicket } from "@/lib/carepilot-api/tickets"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    const ticketId = Number(id)
    if (!Number.isFinite(ticketId)) return apiFail(400, "Invalid ticket id")
    const ticket = await getSynchronizedTicket(ticketId)
    if (!ticket) return apiFail(404, "Ticket not found")
    return NextResponse.json(ticket)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
