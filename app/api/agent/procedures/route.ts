import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getAgentProceduresBundle } from "@/lib/carepilot-api/agent-procedures-from-km"

export async function GET() {
  try {
    const bundle = await getAgentProceduresBundle()
    return NextResponse.json({
      items: bundle.items,
      summary: bundle.summary,
      total: bundle.items.length,
    })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
