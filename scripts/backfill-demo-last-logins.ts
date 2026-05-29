import "./load-env"

import { sql } from "drizzle-orm"

import { SUPPORT_AGENTS, demoLastLoginForEmail } from "@/lib/data/support-agents"
import { getDb } from "@/lib/db"
import { carepilotUsers } from "@/lib/db/schema/carepilot"

/** Backfill demo last_login_at for support agents missing a value (non-destructive). */
async function main() {
  const db = getDb()
  let updated = 0

  for (const agent of SUPPORT_AGENTS) {
    const at = demoLastLoginForEmail(agent.email)
    if (!at) continue

    const result = await db
      .update(carepilotUsers)
      .set({ lastLoginAt: at, updatedAt: new Date() })
      .where(
        sql`lower(${carepilotUsers.email}) = ${agent.email.toLowerCase()} AND ${carepilotUsers.lastLoginAt} IS NULL`,
      )
      .returning({ id: carepilotUsers.id })

    updated += result.length
  }

  console.log(`Backfilled last_login_at for ${updated} user(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
