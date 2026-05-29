import { NextResponse } from "next/server"

import { listOperationalExplanations } from "@/lib/ai/run-llm-explanations"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

export async function GET() {
  try {
    const rows = await listOperationalExplanations()
    return NextResponse.json({ ok: true, rows })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
