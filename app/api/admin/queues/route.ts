import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { adminQueueSupervision } from "@/lib/admin/queues"

export async function GET() {
  try {
    const data = await adminQueueSupervision()
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
