"use client"

import { useMemo } from "react"

import Bar from "@/components/charts/bar"
import { BarChart } from "@/components/charts/bar-chart"
import { BarHorizontalValueAxis } from "@/components/charts/bar-horizontal-value-axis"
import { BarYAxis } from "@/components/charts/bar-y-axis"
import { Grid } from "@/components/charts/grid"
import { Area, AreaChart } from "@/components/charts/area-chart"
import { LineValueAxisY } from "@/components/charts/line-value-axis-y"
import { ChartTooltip } from "@/components/charts/tooltip"
import { XAxis } from "@/components/charts/x-axis"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const BRAND = "var(--primary)"

/** Stable demo window — one point per calendar day (DD/MM style on axis). */
function buildTicketVolumeDemo(): Record<string, unknown>[] {
  const days = [
    "2026-04-02T12:00:00.000Z",
    "2026-04-03T12:00:00.000Z",
    "2026-04-04T12:00:00.000Z",
    "2026-04-05T12:00:00.000Z",
    "2026-04-06T12:00:00.000Z",
    "2026-04-07T12:00:00.000Z",
    "2026-04-08T12:00:00.000Z",
  ]
  const tickets = [1, 1, 1, 1, 2, 3, 1]
  return days.map((date, i) => ({ date, tickets: tickets[i] ?? 0 }))
}

function buildIaDecisionsDemo(): Record<string, unknown>[] {
  return [
    { decision: "Résolution N2", count: 4 },
    { decision: "Escalade vers N3", count: 2 },
    { decision: "Réaffectation N2", count: 2 },
    { decision: "Traitement N3", count: 2 },
  ]
}

const chartCard =
  "min-h-0 gap-0 py-0 border-border bg-background shadow-none"
const chartHeader = "shrink-0 space-y-0 px-3 pb-0 pt-3"
const chartContent = "min-h-0 px-3 pb-3"
const chartInner =
  "overflow-hidden rounded-2xl bg-muted/55 p-2.5 shadow-none dark:bg-muted/35"

export function DashboardTicketsIaCharts() {
  const ticketData = useMemo(() => buildTicketVolumeDemo(), [])
  const iaData = useMemo(() => buildIaDecisionsDemo(), [])

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card className={chartCard}>
        <CardHeader className={chartHeader}>
          <CardTitle className="text-sm font-semibold">
            Volume des tickets (démo)
          </CardTitle>
        </CardHeader>
        <CardContent className={chartContent}>
          <div className={chartInner}>
            <AreaChart
              aspectRatio="16 / 9"
              className="min-h-[200px] w-full"
              data={ticketData}
              margin={{ top: 10, right: 10, bottom: 36, left: 30 }}
              xDataKey="date"
              yDomain={[0, 4]}
            >
              <LineValueAxisY tickValues={[0, 1, 2, 3, 4]} />
              <Grid
                fadeHorizontal={false}
                fadeVertical={false}
                horizontal
                numTicksColumns={7}
                rowTickValues={[0, 1, 2, 3, 4]}
                strokeDasharray="4 6"
                strokeOpacity={0.55}
                vertical
              />
              <Area
                animate
                dataKey="tickets"
                fadeEdges={false}
                fill={BRAND}
                fillOpacity={0.35}
                gradientToOpacity={0}
                stroke={BRAND}
                strokeWidth={2}
              />
              <XAxis
                formatTick={(d) =>
                  d.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                  })
                }
                numTicks={7}
                tickerHalfWidth={22}
              />
              <ChartTooltip
                indicatorColor={BRAND}
                rows={(point) => [
                  {
                    color: BRAND,
                    label: "Tickets",
                    value: point.tickets as number,
                  },
                ]}
                showDots
              />
            </AreaChart>
          </div>
        </CardContent>
      </Card>

      <Card className={chartCard}>
        <CardHeader className={chartHeader}>
          <CardTitle className="text-sm font-semibold">
            Répartition des décisions IA (démo)
          </CardTitle>
        </CardHeader>
        <CardContent className={chartContent}>
          <div className={chartInner}>
            <BarChart
              aspectRatio="16 / 9"
              barGap={0.28}
              className="min-h-[200px] w-full"
              data={iaData}
              margin={{ top: 10, right: 12, bottom: 32, left: 118 }}
              orientation="horizontal"
              xDataKey="decision"
            >
              <Grid
                fadeHorizontal={false}
                fadeVertical={false}
                horizontal={false}
                numTicksColumns={5}
                strokeDasharray="4 6"
                strokeOpacity={0.55}
                vertical
              />
              <Bar dataKey="count" fill={BRAND} stroke={BRAND} />
              <BarYAxis labelMaxWidth={118} showAllLabels />
              <BarHorizontalValueAxis numTicks={5} />
              <ChartTooltip
                indicatorColor={BRAND}
                rows={(point) => [
                  {
                    color: BRAND,
                    label: "Décisions",
                    value: point.count as number,
                  },
                ]}
                showCrosshair={false}
                showDatePill={false}
                showDots={false}
              />
            </BarChart>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
