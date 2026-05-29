import { NextResponse } from "next/server"

import { listMissingInformationAnalyses } from "@/lib/ai/run-missing-information-analysis"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

export async function GET() {
  try {
    const rows = await listMissingInformationAnalyses()
    return NextResponse.json({ ok: true, rows })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
