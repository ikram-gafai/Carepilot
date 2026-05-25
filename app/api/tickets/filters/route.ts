import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getTicketFilterOptions } from "@/lib/carepilot-api/ticket-filters"

export async function GET() {
  try {
    const data = await getTicketFilterOptions()
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
