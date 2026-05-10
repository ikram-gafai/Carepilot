import { NextResponse } from "next/server"

import { apiFail } from "@/lib/api/http"
import { buildBenchmarkReport } from "@/lib/benchmark/report"
import { getDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const db = getDb()
    const report = await buildBenchmarkReport(db)
    return NextResponse.json({ ok: true as const, report })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return apiFail(500, msg)
  }
}
