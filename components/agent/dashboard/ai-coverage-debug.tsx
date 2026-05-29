import type { AgentDashboardAiCoverage } from "@/lib/carepilot-api/agent-dashboard-data"

export function AiCoverageDebug({ coverage }: { coverage: AgentDashboardAiCoverage }) {
  const rows = [
    { label: "Tickets synchronisés", value: coverage.synchronizedTickets },
    { label: "Prédictions escalade", value: coverage.escalationPredictions },
    { label: "Prédictions transfert", value: coverage.transferPredictions },
    { label: "Prédictions SLA", value: coverage.slaPredictions },
    { label: "Prédictions priorité", value: coverage.priorityPredictions },
    { label: "Recommandations d'action", value: coverage.actionRecommendations },
    { label: "Recommandations KM", value: coverage.kmRecommendations },
    { label: "Analyses contexte manquant", value: coverage.missingInformationAnalyses },
    { label: "Synthèses opérationnelles", value: coverage.operationalExplanations },
  ]

  const synced = coverage.synchronizedTickets
  const lowCoverage = rows.some(
    (r) =>
      r.label !== "Tickets synchronisés" &&
      r.label !== "Recommandations KM" &&
      r.label !== "Synthèses opérationnelles" &&
      synced > 0 &&
      r.value < synced * 0.5,
  )

  return (
    <details className="rounded-lg border border-border/80 bg-muted/20 text-xs">
      <summary className="cursor-pointer px-3 py-2 font-medium text-muted-foreground hover:text-foreground">
        Diagnostics couverture IA · {coverage.synchronizedTickets} tickets synchronisés
        {lowCoverage ? " · couverture partielle" : ""}
      </summary>
      <dl className="grid gap-1 border-t border-border/70 px-3 py-2 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-2 py-0.5">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="font-mono tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
