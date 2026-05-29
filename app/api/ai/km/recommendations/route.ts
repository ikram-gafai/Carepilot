import { NextResponse } from "next/server"

import { listKmRecommendations } from "@/lib/ai/run-km-recommendations"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

export async function GET() {
  try {
    const rows = await listKmRecommendations()
    return NextResponse.json({ ok: true, rows })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
