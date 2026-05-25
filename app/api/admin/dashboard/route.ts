import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { adminDashboardBundle } from "@/lib/admin/dashboard"

export async function GET() {
  try {
    const data = await adminDashboardBundle()
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
