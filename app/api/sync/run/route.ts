import { NextResponse } from "next/server"

import { ADMIN_ROLES } from "@/lib/admin-nav"
import { apiFail, routeErrorMessage } from "@/lib/api/http"
import { getCarePilotSession } from "@/lib/auth/session"
import { getDb } from "@/lib/db"
import { cpAgentAuditLogs } from "@/lib/db/schema/cp-agent"
import { runMvpCareSync } from "@/lib/services/sync/sync-service"

export const maxDuration = 120

export async function POST() {
  try {
    const user = await getCarePilotSession()
    if (!user) return apiFail(401, "Authentication required")
    if (!ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
      return apiFail(403, "Admin access required")
    }

    const result = await runMvpCareSync({
      syncType: "manual",
      actorId: user.id,
      actorRole: user.role,
    })

    const db = getDb()
    await db.insert(cpAgentAuditLogs).values({
      actorId: user.id,
      actorRole: user.role,
      actorLabel: `${user.firstName} ${user.lastName}`,
      action: "sync.run",
      entityType: "sync",
      entityId: result.syncLogId != null ? String(result.syncLogId) : null,
      description: "Manual CARE synchronization triggered",
      metadata: { result },
    })

    return NextResponse.json(result)
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
