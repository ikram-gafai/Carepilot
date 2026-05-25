import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { adminWorkforceSupervision } from "@/lib/admin/workforce"

export async function GET() {
  try {
    const data = await adminWorkforceSupervision()
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
