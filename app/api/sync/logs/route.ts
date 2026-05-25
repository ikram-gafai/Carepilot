import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { listSyncLogs } from "@/lib/carepilot-api/sync"

export async function GET(req: Request) {
  try {
    const limit = Number(new URL(req.url).searchParams.get("limit") ?? "20")
    const data = await listSyncLogs(Number.isFinite(limit) ? limit : 20)
    return NextResponse.json({ items: data, total: data.length })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
