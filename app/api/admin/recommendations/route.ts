import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { adminRecommendations } from "@/lib/admin/recommendations"

export async function GET() {
  try {
    const data = await adminRecommendations()
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
