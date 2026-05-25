import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { listSynchronizedKm } from "@/lib/carepilot-api/km"

export async function GET() {
  try {
    const data = await listSynchronizedKm()
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
