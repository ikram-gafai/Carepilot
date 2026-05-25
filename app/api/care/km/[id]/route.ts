import { NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { careGetKmById } from "@/lib/care-api/store"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    const km = await careGetKmById(decodeURIComponent(id))
    if (!km) return apiFail(404, "KM reference not found")
    return NextResponse.json(km)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
