import "./load-env"

import { linkAllTicketAssignees } from "@/lib/cp-agent/assignee-link"
import { getDb } from "@/lib/db"

async function main() {
  const linked = await linkAllTicketAssignees(getDb())
  console.log(`Linked ${linked} ticket(s) to cp_agent users.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
