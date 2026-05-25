import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { listSynchronizedTickets, type TicketListFilters } from "@/lib/carepilot-api/tickets"

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams
    const filters: TicketListFilters = {
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      priority: sp.get("priority") ?? undefined,
      category: sp.get("category") ?? undefined,
      assignedUserId: sp.get("assigned") ?? undefined,
      slaState: (sp.get("sla") as TicketListFilters["slaState"]) ?? undefined,
    }
    const data = await listSynchronizedTickets(filters)
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
