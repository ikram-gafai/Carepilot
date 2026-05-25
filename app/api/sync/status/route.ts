import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getSyncStatus } from "@/lib/carepilot-api/sync"

export async function GET() {
  try {
    const data = await getSyncStatus()
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
