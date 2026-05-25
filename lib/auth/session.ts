import { randomBytes } from "node:crypto"
import { and, eq, gt } from "drizzle-orm"
import { cookies } from "next/headers"

import { CAREPILOT_SESSION_COOKIE, SESSION_LONG_MS, SESSION_SHORT_MS } from "@/lib/auth/constants"
import { getDb, hasDatabaseUrl } from "@/lib/db"
import { carepilotSessions, carepilotUsers } from "@/lib/db/schema/carepilot"

export type CarePilotSessionUser = {
  id: number
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
  role: string
  department: string | null
}

function mapUser(row: typeof carepilotUsers.$inferSelect): CarePilotSessionUser {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    avatarUrl: row.avatarUrl,
    role: row.role,
    department: row.department,
  }
}

export async function getCarePilotSession(): Promise<CarePilotSessionUser | null> {
  if (!hasDatabaseUrl()) return null
  const token = (await cookies()).get(CAREPILOT_SESSION_COOKIE)?.value
  if (!token?.trim()) return null

  try {
    const db = getDb()
    const now = new Date()
    const rows = await db
      .select({ user: carepilotUsers })
      .from(carepilotSessions)
      .innerJoin(carepilotUsers, eq(carepilotSessions.userId, carepilotUsers.id))
      .where(
        and(
          eq(carepilotSessions.token, token),
          gt(carepilotSessions.expiresAt, now),
          eq(carepilotUsers.status, "active"),
        )!,
      )
      .limit(1)

    const u = rows[0]?.user
    return u ? mapUser(u) : null
  } catch {
    return null
  }
}

export async function createCarePilotSessionCookie(
  userId: number,
  remember: boolean,
): Promise<void> {
  const db = getDb()
  const token = randomBytes(32).toString("hex")
  const ttl = remember ? SESSION_LONG_MS : SESSION_SHORT_MS
  const expiresAt = new Date(Date.now() + ttl)

  await db.insert(carepilotSessions).values({
    userId,
    token,
    expiresAt,
  })

  await db
    .update(carepilotUsers)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(carepilotUsers.id, userId))

  const jar = await cookies()
  jar.set(CAREPILOT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(ttl / 1000),
  })
}

export async function destroyCarePilotSession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(CAREPILOT_SESSION_COOKIE)?.value
  if (token && hasDatabaseUrl()) {
    try {
      const db = getDb()
      await db.delete(carepilotSessions).where(eq(carepilotSessions.token, token))
    } catch {
      /* ignore */
    }
  }
  jar.set(CAREPILOT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}
