import { NextResponse } from "next/server"

import { apiFail } from "@/lib/api/http"
import { careGetTicketById } from "@/lib/care-api/store"
import { routeErrorMessage } from "@/lib/api/http"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    const ticket = await careGetTicketById(decodeURIComponent(id))
    if (!ticket) return apiFail(404, "Ticket not found")
    return NextResponse.json(ticket)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
