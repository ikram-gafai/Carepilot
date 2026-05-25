/**
 * Refresh SLA fields from CARE source into synchronized cp_agent tickets.
 */
import "./load-env"

import { getCarePilotOperationalMetrics, refreshSynchronizedSlaFromCareSource } from "@/lib/carepilot-api/metrics"

const updated = await refreshSynchronizedSlaFromCareSource()
const metrics = await getCarePilotOperationalMetrics()

console.log(`Updated ${updated} ticket row(s) with SLA from CARE source.`)
console.log({
  synchronized: metrics.kpis.totalSynchronized,
  open: metrics.kpis.openTickets,
  inProgress: metrics.kpis.inProgressTickets,
  resolved: metrics.kpis.resolvedTickets,
  slaRisk: metrics.kpis.slaRisk,
  syncHealth: metrics.sync.label,
  lastIngestion: metrics.sync.lastIngestionAt,
})
