import { NextResponse } from "next/server"

import { listTransferPredictions } from "@/lib/ai/run-transfer-predictions"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

export async function GET() {
  try {
    const predictions = await listTransferPredictions()
    return NextResponse.json({ ok: true, predictions })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
