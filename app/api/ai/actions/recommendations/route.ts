import { NextResponse } from "next/server"

import { listActionRecommendations } from "@/lib/ai/run-action-recommendations"
import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getCarePilotSession } from "@/lib/auth/session"

export async function GET() {
  try {
    const user = await getCarePilotSession()
    if (!user) return apiFail(401, "Authentication required")

    const rows = await listActionRecommendations()
    return NextResponse.json({ ok: true, rows })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
