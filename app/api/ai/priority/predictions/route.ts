import { NextResponse } from "next/server"

import { listPriorityPredictions } from "@/lib/ai/run-priority-predictions"
import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getCarePilotSession } from "@/lib/auth/session"

export async function GET() {
  try {
    const user = await getCarePilotSession()
    if (!user) return apiFail(401, "Authentication required")

    const rows = await listPriorityPredictions()
    return NextResponse.json({ ok: true, predictions: rows })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
