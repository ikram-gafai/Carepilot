import { eq } from "drizzle-orm"
import { z } from "zod"

import { apiFail, apiOk, parseBody, routeErrorMessage } from "@/lib/api/http"
import { verifyPassword } from "@/lib/auth/password"
import { createCarePilotSessionCookie } from "@/lib/auth/session"
import { getDb, hasDatabaseUrl } from "@/lib/db"
import { carepilotUsers } from "@/lib/db/schema/carepilot"

const bodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
})

export async function POST(req: Request) {
  try {
    if (!hasDatabaseUrl()) {
      return apiFail(503, "Database is not configured")
    }

    const parsed = await parseBody(bodySchema, req)
    if (!parsed.success) return parsed.response

    const { email, password, remember } = parsed.data
    const db = getDb()
    const emailNorm = email.toLowerCase()

    const [user] = await db.select().from(carepilotUsers).where(eq(carepilotUsers.email, emailNorm)).limit(1)

    if (!user || user.status !== "active") {
      return apiFail(401, "Invalid email or password")
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return apiFail(401, "Invalid email or password")
    }

    await createCarePilotSessionCookie(user.id, Boolean(remember))

    return apiOk({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    })
  } catch (e) {
    console.error("[api/auth/login]", e)
    return apiFail(500, routeErrorMessage(e))
  }
}
