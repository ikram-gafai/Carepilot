/**
 * Validation cohérence décisions opérationnelles FO.
 * Usage: bun run validate:decisions
 */
import "./load-env"

import { buildAgentOperationalQueue } from "@/lib/carepilot-api/agent-dashboard-data"
import { getOperationalIntelligenceForTicket } from "@/lib/ai/orchestration/operational-intelligence-orchestrator"
import { baseDecisionFromLabel } from "@/lib/ai/orchestration/orchestrated-ticket-decision"
import { listSynchronizedTickets } from "@/lib/carepilot-api/tickets"

type Failure = { careId: string; rule: string; detail: string }

const TARGET_RANGES = {
  Résoudre: { min: 25, max: 35 },
  "Escalade N3": { min: 8, max: 16 },
  Transfert: { min: 8, max: 16 },
  Suspendre: { min: 4, max: 12 },
} as const

function bucketLabel(label: string): string {
  const base = baseDecisionFromLabel(label)
  switch (base) {
    case "RESOLVE":
      return "Résoudre"
    case "ESCALATE_N3":
      return "Escalade N3"
    case "TRANSFER":
      return "Transfert"
    case "SUSPEND":
    case "REQUEST_INFORMATION":
      return "Suspendre"
    default:
      return label
  }
}

function signalSeverity(
  intelligence: Awaited<ReturnType<typeof getOperationalIntelligenceForTicket>>,
  key: string,
): "low" | "medium" | "high" | null {
  const sig = intelligence?.operationalRisk.signals.find((s) => s.key === key)
  if (!sig) return null
  const sev = sig.severity?.toLowerCase()
  if (sev === "low" || sev === "medium" || sev === "high") return sev
  return null
}

function validateSignals(
  careId: string,
  label: string,
  intelligence: NonNullable<Awaited<ReturnType<typeof getOperationalIntelligenceForTicket>>>,
  failures: Failure[],
) {
  const base = baseDecisionFromLabel(label)
  const esc = signalSeverity(intelligence, "escalation")
  const trf = signalSeverity(intelligence, "transfer")
  const missing = signalSeverity(intelligence, "missing_context")

  if (/Apply KM|Appliquer KM/i.test(label)) {
    failures.push({ careId, rule: "apply_km_label", detail: "Appliquer KM ne doit pas apparaître comme action suggérée" })
  }

  if (base === "RESOLVE") {
    if (esc === "high") {
      failures.push({ careId, rule: "resolve_high_escalation", detail: `${label} avec signal escalade élevé` })
    }
    if (trf === "high") {
      failures.push({ careId, rule: "resolve_high_transfer", detail: `${label} avec signal transfert élevé` })
    }
  }

  if (base === "ESCALATE_N3" && esc !== "high") {
    failures.push({ careId, rule: "escalate_without_high_signal", detail: `Escalade N3 avec escalade ${esc ?? "absent"}` })
  }

  if (base === "TRANSFER") {
    if (trf !== "high") {
      failures.push({ careId, rule: "transfer_without_high_signal", detail: `Transfert avec routage ${trf ?? "absent"}` })
    }
    if (!intelligence.orchestrated?.decisionTarget) {
      failures.push({ careId, rule: "transfer_without_target", detail: "Transfert sans périmètre destination" })
    }
  }

  if ((base === "SUSPEND" || base === "REQUEST_INFORMATION") && missing !== "high") {
    failures.push({
      careId,
      rule: "hold_without_missing_signal",
      detail: `${label} avec contexte manquant ${missing ?? "absent"}`,
    })
  }
}

async function main() {
  const [{ items: tableItems }, queue] = await Promise.all([
    listSynchronizedTickets(),
    buildAgentOperationalQueue(),
  ])

  const dashboardById = new Map(queue.map((r) => [r.ticketId, r]))
  const failures: Failure[] = []

  const dist = { Résoudre: 0, "Escalade N3": 0, Transfert: 0, Suspendre: 0, "Demander des informations": 0 }
  const dashDist = { Résoudre: 0, "Escalade N3": 0, Transfert: 0, Suspendre: 0 }
  let withKm = 0

  for (const item of tableItems) {
    const dash = dashboardById.get(item.id)
    const intelligence = await getOperationalIntelligenceForTicket(item.id)
    const detailLabel = intelligence?.recommendedAction.actionLabel ?? "—"
    const tableLabel = item.suggestedActionLabel
    const dashLabel = dash?.aiActionLabel ?? "—"

    const bucket = bucketLabel(tableLabel)
    dist[bucket as keyof typeof dist] = (dist[bucket as keyof typeof dist] ?? 0) + 1
    if (tableLabel.startsWith("Demander")) dist["Demander des informations"]++

    dashDist[bucketLabel(dashLabel) as keyof typeof dashDist] =
      (dashDist[bucketLabel(dashLabel) as keyof typeof dashDist] ?? 0) + 1
    if (intelligence?.kmRecommendation.available) withKm++

    if (tableLabel !== dashLabel) {
      failures.push({ careId: item.careId, rule: "table_dashboard_mismatch", detail: `table=${tableLabel} dashboard=${dashLabel}` })
    }
    if (tableLabel !== detailLabel) {
      failures.push({ careId: item.careId, rule: "table_detail_mismatch", detail: `table=${tableLabel} detail=${detailLabel}` })
    }

    const base = baseDecisionFromLabel(tableLabel)
    if (base === "RESOLVE" && !intelligence?.kmRecommendation.available) {
      failures.push({ careId: item.careId, rule: "resolve_without_km", detail: "Résoudre suggéré sans procédure KM" })
    }
    if (tableLabel.startsWith("Transfert") && intelligence?.orchestrated?.kmType === "resolution") {
      failures.push({ careId: item.careId, rule: "transfer_with_resolution_km", detail: "Transfert avec KM de type résolution" })
    }

    if (intelligence) validateSignals(item.careId, tableLabel, intelligence, failures)
  }

  console.log("Distribution décisions workflow FO (table tickets)")
  console.log(`  Total tickets actifs: ${tableItems.length}`)
  console.log(`  Résoudre: ${dist.Résoudre ?? 0}`)
  console.log(`  Escalade N3: ${dist["Escalade N3"] ?? 0}`)
  console.log(`  Transfert: ${dist.Transfert ?? 0}`)
  console.log(`  Suspendre / Demander infos: ${dist.Suspendre ?? 0}`)
  console.log(`    Demander des informations: ${dist["Demander des informations"] ?? 0}`)
  console.log(`  Tickets avec KM: ${withKm}`)
  console.log("")
  console.log("Distribution orchestrée tableau de bord")
  console.log(`  Résoudre: ${dashDist.Résoudre ?? 0}`)
  console.log(`  Escalade N3: ${dashDist["Escalade N3"] ?? 0}`)
  console.log(`  Transfert: ${dashDist.Transfert ?? 0}`)
  console.log(`  Suspendre / Demander infos: ${dashDist.Suspendre ?? 0}`)
  console.log("")

  if ((dist.Résoudre ?? 0) === 0) {
    failures.push({ careId: "—", rule: "resolve_zero", detail: "Aucune décision Résoudre" })
  }

  for (const [label, range] of Object.entries(TARGET_RANGES)) {
    const count = dist[label as keyof typeof dist] ?? 0
    if (count < range.min || count > range.max) {
      failures.push({
        careId: "—",
        rule: "distribution_out_of_range",
        detail: `${label}=${count} (attendu ${range.min}–${range.max})`,
      })
    }
  }

  if (failures.length === 0) {
    console.log("✓ Validation décisions workflow FO réussie")
    process.exit(0)
  }

  console.error(`✗ Validation décisions workflow FO ÉCHOUÉE (${failures.length} problèmes)`)
  for (const f of failures.slice(0, 30)) {
    console.error(`  [${f.rule}] ${f.careId}: ${f.detail}`)
  }
  if (failures.length > 30) console.error(`  … et ${failures.length - 30} de plus`)
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
