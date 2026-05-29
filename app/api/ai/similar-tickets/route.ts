import { NextResponse } from "next/server"

import { listSimilarTicketResults } from "@/lib/ai/run-similar-ticket-retrieval"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

export async function GET() {
  try {
    const rows = await listSimilarTicketResults()
    return NextResponse.json({ ok: true, rows })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
