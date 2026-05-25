"use client"

import { Area, AreaChart, YAxis } from "recharts"

import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

import { ADMIN_CHART_BLUE } from "./admin-chart-theme"

const SPARK_H = 48

/**
 * KPI sparkline — `ChartContainer` + `AreaChart` (Agent dashboard SLA stack).
 * Uses a fixed vertical frame so Recharts 3 `ResponsiveContainer` always gets height
 * (flex + `aspect-video` alone often collapses embedded sparklines to 0px).
 */
export function AdminSparkline({
  points,
  className,
  id,
  color = ADMIN_CHART_BLUE.base,
}: {
  points: readonly number[]
  className?: string
  /** Stable id per card (`data-chart` + gradient id uniqueness) */
  id: string
  /** HSL — `ADMIN_CHART_*` / semantic hues */
  color?: string
}) {
  if (points.length === 0) return null

  const padded =
    points.length === 1 ? ([points[0]!, points[0]!] as const) : ([...points] as const)
  const data = padded.map((value, i) => ({ i, value }))
  const maxVal = Math.max(...padded, 0)
  /** Keep flat / zero series from sitting on the clip edge */
  const yTop = maxVal <= 0 ? 1 : maxVal * 1.12

  const config = {
    value: { label: "Trend", color },
  } satisfies ChartConfig

  const chartId = `kpi-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`
  const fillId = `spark-fill-${chartId}`

  return (
    <ChartContainer
      id={chartId}
      config={config}
      initialDimension={{ width: 360, height: SPARK_H }}
      className={cn(
        "aspect-auto !h-12 !min-h-12 w-full max-w-none min-w-0 justify-normal p-0 shadow-none",
        "[&_.recharts-responsive-container]:!h-12 [&_.recharts-responsive-container]:!min-h-12 [&_.recharts-responsive-container]:!w-full [&_.recharts-responsive-container]:max-h-none",
        className,
      )}
    >
      <AreaChart
        data={data}
        margin={{ top: 4, right: 2, left: 0, bottom: 2 }}
        accessibilityLayer={false}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <YAxis hide domain={[0, yTop]} width={0} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          fill={`url(#${fillId})`}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
          connectNulls
        />
      </AreaChart>
    </ChartContainer>
  )
}
