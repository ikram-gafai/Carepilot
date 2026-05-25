import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getAgentDashboardBundle } from "@/lib/carepilot-api/agent-dashboard"

export async function GET() {
  try {
    const data = await getAgentDashboardBundle()
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
