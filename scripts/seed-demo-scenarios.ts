import { writeFileSync } from "node:fs"
import { join } from "node:path"

import { readFileSync } from "node:fs"
import { join } from "node:path"

import "./load-env"

import { seedDemoScenarios } from "@/lib/ai/seed-demo-scenarios"
import { getSql } from "@/lib/db"

async function ensureCpAgentSyncSchema() {
  const patch = readFileSync(join(process.cwd(), "sql", "patches", "005_cp_agent_mvp_sync.sql"), "utf8")
  await getSql().unsafe(patch)
}

async function main() {
  await ensureCpAgentSyncSchema()
  const result = await seedDemoScenarios()
  const manifestPath = join(process.cwd(), "docs", "demo-scenarios", "demo-manifest.json")
  writeFileSync(manifestPath, `${JSON.stringify(result, null, 2)}\n`, "utf8")

  console.log(JSON.stringify(result, null, 2))
  console.log(`\nManifest written to ${manifestPath}`)
  console.log("\nDemo ticket URLs:")
  for (const entry of result.manifest) {
    console.log(`  ${entry.slug.padEnd(22)} ${entry.careId} → ${entry.agentUrl}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
