import { NextResponse } from "next/server"

import { apiFail } from "@/lib/api/http"

export const maxDuration = 120

/**
 * Legacy route — automatic / CLI sync disabled for manual-only phase.
 * Use POST /api/sync/run (Admin → Run Sync Now) instead.
 */
export async function POST() {
  return apiFail(
    410,
    "Automatic sync via /api/sync/care is disabled. Use POST /api/sync/run (Admin → Run Sync Now).",
  )
}
