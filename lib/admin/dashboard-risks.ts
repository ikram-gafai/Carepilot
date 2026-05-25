import type { DashboardPressureRow } from "@/lib/admin/dashboard"

export type OperationalRiskItem = {
  id: string
  title: string
  area: string
  severity: "critical" | "warning"
  count: number
  badge: string
}

function riskFromPerimeter(row: DashboardPressureRow): OperationalRiskItem | null {
  if (row.slaRisk >= 2) {
    return {
      id: `sla-${row.name}`,
      title: "SLA breach",
      area: row.name,
      severity: row.slaRisk >= 4 ? "critical" : "warning",
      count: row.slaRisk,
      badge: row.slaRisk >= 4 ? `${row.slaRisk} critical` : `${row.slaRisk} at risk`,
    }
  }
  if (row.open >= 4) {
    const sev = row.open >= 8 ? "critical" : "warning"
    return {
      id: `load-${row.name}`,
      title: "Queue overload",
      area: row.name,
      severity: sev,
      count: row.open,
      badge: `${row.open} open`,
    }
  }
  return null
}

function riskFromStore(store: {
  storeName: string
  city: string
  open: number
  slaRisk: number
}): OperationalRiskItem | null {
  const score = store.open + store.slaRisk * 2
  if (score < 5) return null
  const sev = store.open >= 8 || store.slaRisk >= 4 ? "critical" : "warning"
  return {
    id: `store-${store.storeName}`,
    title: "Store overload",
    area: `${store.storeName} · ${store.city}`,
    severity: sev,
    count: store.open,
    badge: `${store.open} open`,
  }
}

/** SLA, perimeter queues, critical priority, and overloaded stores. */
export function buildTopOperationalRisks(input: {
  pressure: DashboardPressureRow[]
  criticalOpen: number
  storeWorkload: { storeName: string; city: string; open: number; slaRisk: number }[]
}): OperationalRiskItem[] {
  const items: OperationalRiskItem[] = []

  for (const row of input.pressure) {
    const r = riskFromPerimeter(row)
    if (r) items.push(r)
  }

  for (const store of input.storeWorkload) {
    const r = riskFromStore(store)
    if (r) items.push(r)
  }

  if (input.criticalOpen >= 1) {
    items.push({
      id: "critical-priority",
      title: "Critical priority",
      area: "Operations",
      severity: input.criticalOpen >= 3 ? "critical" : "warning",
      count: input.criticalOpen,
      badge: `${input.criticalOpen} open`,
    })
  }

  const rank = (s: OperationalRiskItem) => (s.severity === "critical" ? 1000 : 500) + s.count
  const seen = new Set<string>()
  return items
    .sort((a, b) => rank(b) - rank(a))
    .filter((item) => {
      const key = `${item.title}:${item.area}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 4)
}
