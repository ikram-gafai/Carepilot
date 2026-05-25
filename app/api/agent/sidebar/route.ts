import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getCarePilotSession } from "@/lib/auth/session"
import { getAgentSidebarSnapshot } from "@/lib/carepilot-api/agent-sidebar"

export async function GET() {
  try {
    const session = await getCarePilotSession()
    const data = await getAgentSidebarSnapshot(session?.email)
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
