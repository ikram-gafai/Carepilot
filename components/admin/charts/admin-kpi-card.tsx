"use client"

import { TrendingDown, TrendingUp } from "lucide-react"

import type { AdminHealth } from "@/lib/queries/admin"
import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

import { ADMIN_CHART_BLUE } from "./admin-chart-theme"
import { AdminSparkline } from "./admin-sparkline"

const HEALTH_DOT: Record<AdminHealth, string> = {
  stable: "bg-zinc-400",
  healthy: "bg-zinc-400",
  overloaded: "bg-amber-500",
  degraded: "bg-amber-500",
  delayed: "bg-amber-500",
  partial_failure: "bg-destructive",
}

export function AdminKpiCard({
  label,
  value,
  sub,
  health,
  sparkline,
  sparkId,
  trendPct,
}: {
  label: string
  value: string
  sub?: string
  health?: AdminHealth
  sparkline?: number[]
  sparkId: string
  trendPct?: number | null
}) {
  const trendWarn = trendPct != null && trendPct >= 10

  return (
    <div
      className={cn(
        adminSurfaces.metric,
        "group flex min-h-[88px] flex-col justify-between transition-shadow hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
        {health ? (
          <span className={cn("mt-0.5 size-1.5 shrink-0 rounded-full", HEALTH_DOT[health])} aria-hidden />
        ) : null}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xl font-semibold tabular-nums tracking-tight text-zinc-900">{value}</p>
          {sub ? <p className="mt-0.5 truncate text-[10px] text-zinc-500">{sub}</p> : null}
          {trendPct != null ? (
            <p
              className={cn(
                "mt-1 flex items-center gap-0.5 text-[10px] font-medium",
                trendWarn ? "text-amber-700" : "text-muted-foreground",
              )}
            >
              {trendPct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {trendPct >= 0 ? "+" : ""}
              {trendPct}% vs prior week
            </p>
          ) : null}
        </div>
        {sparkline?.length ? (
          <AdminSparkline points={sparkline} id={sparkId} color={ADMIN_CHART_BLUE.base} />
        ) : null}
      </div>
    </div>
  )
}
