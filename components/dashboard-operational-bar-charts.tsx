"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { getChartSeriesColors } from "@/lib/chart-series-colors"

const chartCard =
  "flex min-h-0 flex-col gap-0 border-border bg-background py-0 shadow-none"
const chartHeader = "shrink-0 space-y-1 border-b border-border px-4 py-3"
const chartContent = "flex min-h-0 flex-1 flex-col p-3"
const chartInner =
  "min-h-[220px] flex-1 overflow-hidden rounded-xl bg-muted/50 p-2 shadow-none dark:bg-muted/35"

const [predictedColorOther] = getChartSeriesColors(2)
/** Darker than chart-2 so “Predicted share” reads clearly over “Remaining mix”. */
const predictedColorPct = "var(--chart-4)" as const

const predictedConfig = {
  other: {
    label: "Remaining mix",
    color: predictedColorOther,
  },
  pct: {
    label: "Predicted share",
    color: predictedColorPct,
  },
} satisfies ChartConfig

const [ticketsSingleColor] = getChartSeriesColors(1)
const ticketsBrandConfig = {
  n: {
    label: "Tickets",
    color: ticketsSingleColor,
  },
} satisfies ChartConfig

const ticketsRoutingConfig = {
  n: {
    label: "Tickets",
    color: ticketsSingleColor,
  },
} satisfies ChartConfig

/** Recharts: symmetric inset per side → bar width ≈ 100% − 2×gap (of category band). */
const PREDICTED_BAR_WIDTH_PCT = 90
const predictedBarCategoryGap = `${(100 - PREDICTED_BAR_WIDTH_PCT) / 2}%`

export function DashboardOperationalBarCharts() {
  const predicted = useMemo(
    () => [
      { label: "N2 handling", pct: 58, count: 32 },
      { label: "N3 escalation", pct: 34, count: 12 },
      { label: "Network transfer", pct: 22, count: 7 },
      { label: "Hardware transfer", pct: 16, count: 4 },
      { label: "Waiting on store", pct: 9, count: 3 },
    ],
    []
  )

  const predictedStacked = useMemo(
    () =>
      predicted.map((d) => ({
        ...d,
        other: Math.round((100 - d.pct) * 10) / 10,
      })),
    [predicted]
  )

  const missing = useMemo(
    () => [
      { label: "SMAC / Lane ID", n: 6 },
      { label: "Error code / logs", n: 4 },
      { label: "Reboot validation", n: 3 },
      { label: "Store feedback", n: 2 },
    ],
    []
  )

  const routing = useMemo(
    () => [
      { label: "N2 handling", n: 32 },
      { label: "N3 escalation", n: 12 },
      { label: "Network transfer", n: 7 },
      { label: "Hardware transfer", n: 4 },
      { label: "Waiting on store", n: 3 },
    ],
    []
  )

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className={`${chartCard} w-full`}>
        <CardHeader className={chartHeader}>
          <CardTitle className="text-sm font-semibold">
            Predicted Operational Outcome
          </CardTitle>
        </CardHeader>
        <CardContent className={chartContent}>
          <div className={chartInner}>
            <ChartContainer
              className="aspect-auto h-[260px] w-full max-w-full sm:h-[280px]"
              config={predictedConfig}
            >
              <BarChart
                accessibilityLayer
                data={predictedStacked}
                margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                barCategoryGap={predictedBarCategoryGap}
                barGap={0}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  height={40}
                  interval={0}
                  minTickGap={8}
                  padding={{ left: 0, right: 0 }}
                  textAnchor="middle"
                  tick={{ fontSize: 10, fontWeight: 400 }}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                  tickMargin={6}
                  width={36}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as {
                          label?: string
                          count?: number
                        }
                        if (!row?.label) {
                          return null
                        }
                        return (
                          <div className="grid gap-0.5">
                            <span>{row.label}</span>
                            {row.count != null ? (
                              <span className="text-[11px] font-normal text-muted-foreground">
                                {row.count} tickets
                              </span>
                            ) : null}
                          </div>
                        )
                      }}
                    />
                  }
                  cursor={false}
                />
                <Bar
                  dataKey="other"
                  stackId="pred"
                  fill="var(--color-other)"
                  fillOpacity={0.82}
                  radius={[0, 0, 6, 6]}
                  stroke="var(--background)"
                  strokeWidth={1}
                  strokeOpacity={0.35}
                />
                <Bar
                  dataKey="pct"
                  stackId="pred"
                  fill="var(--color-pct)"
                  fillOpacity={0.95}
                  radius={[6, 6, 0, 0]}
                  stroke="var(--background)"
                  strokeWidth={1}
                  strokeOpacity={0.35}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2">
        <Card className={chartCard}>
          <CardHeader className={chartHeader}>
            <CardTitle className="text-sm font-semibold">
              Missing Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent className={chartContent}>
            <div className={chartInner}>
              <ChartContainer
                className="aspect-auto h-[240px] w-full max-w-full"
                config={ticketsBrandConfig}
              >
                <AreaChart
                  accessibilityLayer
                  data={missing}
                  margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="dashMissingN"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--color-n)"
                        stopOpacity={0.85}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-n)"
                        stopOpacity={0.08}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    angle={-22}
                    axisLine={false}
                    dataKey="label"
                    height={68}
                    interval={0}
                    minTickGap={4}
                    textAnchor="end"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    tickMargin={6}
                  />
                  <YAxis
                    axisLine={false}
                    domain={[0, 8]}
                    tickLine={false}
                    tickMargin={6}
                    width={28}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="dot" />}
                    cursor={false}
                  />
                  <Area
                    dataKey="n"
                    fill="url(#dashMissingN)"
                    stroke="var(--color-n)"
                    strokeWidth={1.5}
                    type="natural"
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={chartCard}>
          <CardHeader className={chartHeader}>
            <CardTitle className="text-sm font-semibold">
              Operational Routing Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className={chartContent}>
            <div className={chartInner}>
              <ChartContainer
                className="aspect-auto h-[240px] w-full max-w-full"
                config={ticketsRoutingConfig}
              >
                <AreaChart
                  accessibilityLayer
                  data={routing}
                  margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="dashRouteN" x1="0" x2="0" y1="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--color-n)"
                        stopOpacity={0.95}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-n)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    angle={-22}
                    axisLine={false}
                    dataKey="label"
                    height={68}
                    interval={0}
                    minTickGap={4}
                    textAnchor="end"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    tickMargin={6}
                  />
                  <YAxis
                    axisLine={false}
                    domain={[0, "auto"]}
                    tickLine={false}
                    tickMargin={6}
                    width={32}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="dot" />}
                    cursor={false}
                  />
                  <Area
                    dataKey="n"
                    fill="url(#dashRouteN)"
                    stroke="var(--color-n)"
                    strokeWidth={1.5}
                    type="natural"
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
