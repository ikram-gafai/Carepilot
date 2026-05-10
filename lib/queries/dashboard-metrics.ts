import { getSql } from "@/lib/db"

export type DashboardMetrics = {
  backlog: number
  ticketsByStatus: Record<string, number>
  slaAtRisk: number
  /** Share of finished syncs marked success among the last N runs (null if none). */
  syncSuccessRate: number | null
  escalationRate: number
  transferRate: number
  missingInformationRate: number
  kmRecommendationCoverage: number
  lastSync: {
    finishedAt: string | null
    status: string | null
    imported: number
    updated: number
    errorMessage: string | null
  } | null
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const sql = getSql()

  type AggRow = {
    backlog: number
    sla_at_risk: number
    escalation_rate: string | number | null
    transfer_rate: string | number | null
    missing_information_rate: string | number | null
    km_reco_coverage: string | number | null
  }

  const aggRows = await sql`
    WITH base AS (
      SELECT t.id,
             t.status,
             s.sla_due_at,
             s.escalation_required,
             s.transfer_required,
             s.missing_information_flag,
             EXISTS (SELECT 1 FROM carepilot.km_recommendations k WHERE k.ticket_id = t.id) AS has_km_reco
      FROM carepilot.tickets t
      JOIN care_source.tickets s ON s.id = t.source_ticket_id
    )
    SELECT
      COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS','WAITING_STORE'))::int AS backlog,
      COUNT(*) FILTER (WHERE sla_due_at IS NOT NULL AND sla_due_at < NOW() + INTERVAL '8 hours'
        AND status NOT IN ('RESOLVED','TRANSFERRED'))::int AS sla_at_risk,
      AVG(CASE WHEN escalation_required THEN 1.0 ELSE 0.0 END) AS escalation_rate,
      AVG(CASE WHEN transfer_required THEN 1.0 ELSE 0.0 END) AS transfer_rate,
      AVG(CASE WHEN missing_information_flag THEN 1.0 ELSE 0.0 END) AS missing_information_rate,
      AVG(CASE WHEN has_km_reco THEN 1.0 ELSE 0.0 END) AS km_reco_coverage
    FROM base;
  `
  const agg = aggRows[0] as AggRow | undefined

  const statusRows = await sql`
    SELECT status, COUNT(*)::int AS c
    FROM carepilot.tickets
    GROUP BY status
    ORDER BY status;
  `

  const ticketsByStatus: Record<string, number> = {}
  for (const r of statusRows) {
    ticketsByStatus[r.status] = r.c
  }

  const syncRateRows = await sql`
    WITH recent AS (
      SELECT status
      FROM carepilot.sync_logs
      WHERE sync_finished_at IS NOT NULL
      ORDER BY sync_started_at DESC
      LIMIT 25
    )
    SELECT
      COUNT(*)::int AS n,
      COUNT(*) FILTER (WHERE lower(status) = 'success')::int AS successes
    FROM recent;
  `
  type SyncRateRow = { n: number; successes: number }
  const syncRate = syncRateRows[0] as SyncRateRow | undefined
  const syncSuccessRate =
    syncRate && syncRate.n > 0
      ? Math.min(1, Math.max(0, syncRate.successes / syncRate.n))
      : null

  const syncRows = await sql`
    SELECT sync_finished_at, status, tickets_imported, tickets_updated, error_message
    FROM carepilot.sync_logs
    ORDER BY sync_started_at DESC
    LIMIT 1;
  `

  type SyncRow = {
    sync_finished_at: Date | null
    status: string
    tickets_imported: number
    tickets_updated: number
    error_message: string | null
  }

  const sync = syncRows[0] as SyncRow | undefined

  return {
    backlog: agg?.backlog ?? 0,
    ticketsByStatus,
    slaAtRisk: agg?.sla_at_risk ?? 0,
    syncSuccessRate,
    escalationRate: clampPct(Number(agg?.escalation_rate ?? 0)),
    transferRate: clampPct(Number(agg?.transfer_rate ?? 0)),
    missingInformationRate: clampPct(Number(agg?.missing_information_rate ?? 0)),
    kmRecommendationCoverage: clampPct(Number(agg?.km_reco_coverage ?? 0)),
    lastSync: sync
      ? {
          finishedAt: sync.sync_finished_at?.toISOString() ?? null,
          status: sync.status,
          imported: sync.tickets_imported,
          updated: sync.tickets_updated,
          errorMessage: sync.error_message,
        }
      : null,
  }
}

function clampPct(v: number): number {
  if (Number.isNaN(v)) return 0
  return Math.min(0.95, Math.max(0, v))
}
