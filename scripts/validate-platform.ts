/**
 * Platform validation — DB sync, orchestration payloads, demo scenarios.
 * Usage: bun run validate:platform
 */
import "./load-env"

import { count, eq, sql } from "drizzle-orm"

import { DEMO_SCENARIOS } from "@/lib/care-operational/demo-scenarios"
import { getOperationalIntelligenceForTicket } from "@/lib/ai/orchestration/operational-intelligence-orchestrator"
import { getAgentDashboardAiCoverage } from "@/lib/carepilot-api/agent-dashboard-data"
import { getDb } from "@/lib/db"
import { careSourceTickets } from "@/lib/db/schema/care-source"
import { cpAgentTickets } from "@/lib/db/schema/cp-agent"

type Check = { name: string; ok: boolean; detail: string }

const checks: Check[] = []

function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail })
  const mark = ok ? "✓" : "✗"
  console.log(`${mark} ${name}: ${detail}`)
}

async function main() {
  const db = getDb()

  const [careCount] = await db.select({ c: count() }).from(careSourceTickets)
  const [cpCount] = await db.select({ c: count() }).from(cpAgentTickets)
  record("care_source.tickets", (careCount?.c ?? 0) >= 70, `${careCount?.c ?? 0} rows (≥70 expected)`)
  record("cp_agent.tickets", (cpCount?.c ?? 0) >= 8, `${cpCount?.c ?? 0} rows (≥8 demo minimum)`)

  const coverage = await getAgentDashboardAiCoverage()
  const synced = coverage.synchronizedTickets
  console.log("\nAI coverage diagnostics:")
  console.log(`  synchronized tickets: ${coverage.synchronizedTickets}`)
  console.log(`  escalation predictions: ${coverage.escalationPredictions}`)
  console.log(`  transfer predictions: ${coverage.transferPredictions}`)
  console.log(`  sla predictions: ${coverage.slaPredictions}`)
  console.log(`  priority predictions: ${coverage.priorityPredictions}`)
  console.log(`  action recommendations: ${coverage.actionRecommendations}`)
  console.log(`  km recommendations: ${coverage.kmRecommendations}`)
  console.log(`  missing-info analyses: ${coverage.missingInformationAnalyses}`)
  console.log(`  operational explanations: ${coverage.operationalExplanations}`)
  console.log("")

  const minAi = Math.max(8, Math.floor(synced * 0.5))
  const aiCoverageChecks = [
    { name: "ai escalation predictions", value: coverage.escalationPredictions, min: minAi },
    { name: "ai transfer predictions", value: coverage.transferPredictions, min: minAi },
    { name: "ai sla predictions", value: coverage.slaPredictions, min: minAi },
    { name: "ai priority predictions", value: coverage.priorityPredictions, min: minAi },
    { name: "ai action recommendations", value: coverage.actionRecommendations, min: minAi },
    { name: "ai missing information", value: coverage.missingInformationAnalyses, min: minAi },
    { name: "ai km recommendations", value: coverage.kmRecommendations, min: 1 },
    { name: "ai operational explanations", value: coverage.operationalExplanations, min: 8 },
  ] as const

  for (const check of aiCoverageChecks) {
    record(check.name, check.value >= check.min, `${check.value} rows (≥${check.min} expected)`)
  }

  let demoOk = 0
  for (const scenario of DEMO_SCENARIOS) {
    const [ticket] = await db
      .select({ id: cpAgentTickets.id, careId: cpAgentTickets.careId })
      .from(cpAgentTickets)
      .where(eq(cpAgentTickets.careId, scenario.careId))
      .limit(1)

    if (!ticket) {
      record(`demo ${scenario.slug}`, false, `missing ticket ${scenario.careId}`)
      continue
    }

    const intel = await getOperationalIntelligenceForTicket(ticket.id)
    if (!intel) {
      record(`demo ${scenario.slug}`, false, "orchestrator returned null")
      continue
    }

    const actionOk = intel.recommendedAction.available
    const actionMatch =
      intel.recommendedAction.action === scenario.ai.action.recommended
    const explOk = intel.operationalExplanation.available
    const qualityOk =
      !scenario.ai.missing.fields.length || intel.ticketQuality.available
    const ok = actionOk && actionMatch && explOk && qualityOk

    if (ok) demoOk++
    record(
      `demo ${scenario.slug}`,
      ok,
      `id=${ticket.id} action=${intel.recommendedAction.action} modules=${intel.meta.modulesAvailable}/${intel.meta.modulesTotal}`,
    )
  }

  record("demo scenarios pass", demoOk === DEMO_SCENARIOS.length, `${demoOk}/${DEMO_SCENARIOS.length}`)

  // Ollama optional check
  try {
    const base = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) })
    record("ollama reachable", res.ok, res.ok ? base : `HTTP ${res.status}`)
  } catch (e) {
    record("ollama reachable", false, e instanceof Error ? e.message : String(e))
  }

  const failed = checks.filter((c) => !c.ok)
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
  if (failed.length > 0) {
    console.error("\nFailed:")
    for (const f of failed) console.error(`  - ${f.name}: ${f.detail}`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
