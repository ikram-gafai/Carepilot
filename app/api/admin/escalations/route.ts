import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { adminEscalations } from "@/lib/admin/escalations"

export async function GET() {
  try {
    const data = await adminEscalations()
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
