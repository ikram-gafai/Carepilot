import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { adminFeedbackSupervision } from "@/lib/admin/feedback"

export async function GET() {
  try {
    const data = await adminFeedbackSupervision()
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
