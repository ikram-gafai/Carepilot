import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { careListKm } from "@/lib/care-api/store"

export async function GET() {
  try {
    const data = await careListKm()
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
