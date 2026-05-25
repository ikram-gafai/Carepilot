import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getAgentProceduresFromKm } from "@/lib/carepilot-api/agent-procedures-from-km"

export async function GET() {
  try {
    const items = await getAgentProceduresFromKm()
    return NextResponse.json({ items, total: items.length })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
