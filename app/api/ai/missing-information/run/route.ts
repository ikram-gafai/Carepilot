import { NextResponse } from "next/server"
import { z } from "zod"

import { ADMIN_ROLES } from "@/lib/admin-nav"
import { runMissingInformationAnalysis } from "@/lib/ai/run-missing-information-analysis"
import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getCarePilotSession } from "@/lib/auth/session"

export const maxDuration = 120

const bodySchema = z.object({
  ticketIds: z.array(z.number().int().positive()).optional(),
})

export async function POST(req: Request) {
  try {
    const user = await getCarePilotSession()
    if (!user) return apiFail(401, "Authentication required")
    if (!ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
      return apiFail(403, "Admin access required")
    }

    let ticketIds: number[] | undefined
    const contentType = req.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      let raw: unknown
      try {
        raw = await req.json()
      } catch {
        raw = {}
      }
      const parsed = bodySchema.safeParse(raw)
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        return apiFail(400, issues || "Validation failed")
      }
      ticketIds = parsed.data.ticketIds
    }

    const result = await runMissingInformationAnalysis({ ticketIds })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
