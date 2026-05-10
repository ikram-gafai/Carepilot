import { NextResponse } from "next/server"

import { apiFail } from "@/lib/api/http"
import { getDb } from "@/lib/db"
import { runCareSync } from "@/lib/sync/care-sync"

export const maxDuration = 120

export async function POST() {
  try {
    const db = getDb()
    const result = await runCareSync(db)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return apiFail(500, msg)
  }
}
