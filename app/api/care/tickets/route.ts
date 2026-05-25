import { NextRequest, NextResponse } from "next/server"

import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { careListTickets } from "@/lib/care-api/store"

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const limit = sp.has("limit") ? Number(sp.get("limit")) : undefined
    const offset = sp.has("offset") ? Number(sp.get("offset")) : undefined
    const syncWindowRaw = sp.get("syncWindow")
    const syncWindow =
      syncWindowRaw === "full" || syncWindowRaw === "initial" ? syncWindowRaw : undefined
    const data = await careListTickets({
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
      syncWindow,
    })
    return NextResponse.json(data)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
