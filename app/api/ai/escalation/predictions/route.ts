import { NextResponse } from "next/server"

import { listEscalationPredictions } from "@/lib/ai/run-escalation-predictions"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

export async function GET() {
  try {
    const items = await listEscalationPredictions()
    return NextResponse.json({ ok: true, items, total: items.length })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
