/**
 * Évaluation benchmark MVP — métriques plafonnées à 95 % (réalisme académique).
 * Prérequis : sync + pipeline ; jeu golden (`bun run db:seed:golden`).
 */
import "./load-env"

import { buildBenchmarkReport } from "@/lib/benchmark/report"
import { getDb } from "@/lib/db"

async function main() {
  const report = await buildBenchmarkReport(getDb())
  console.log(JSON.stringify(report, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
