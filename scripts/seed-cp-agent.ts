import "./load-env"

import {
  cpAgentEmailFromAuth,
  supportAgentDisplayName,
  SUPPORT_AGENTS,
} from "@/lib/data/support-agents"
import { getSql } from "@/lib/db"

async function main() {
  const sql = getSql()
  for (const agent of SUPPORT_AGENTS) {
    const email = cpAgentEmailFromAuth(agent.email)
    const displayName = supportAgentDisplayName(agent)
    await sql`
      INSERT INTO cp_agent.users (email, display_name, role)
      VALUES (${email}, ${displayName}, ${agent.cpAgentRole})
      ON CONFLICT (email) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        role = EXCLUDED.role
    `
  }

  console.log("cp_agent support agents upserted (tickets linked on db:sync).")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
