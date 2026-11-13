"use client"

import {
  ADMIN_CHART_BLUE,
  ADMIN_CHART_GRID,
  ADMIN_CHART_TICK,
} from "@/components/admin/charts/admin-chart-theme"
import { AdminEscalationTrendChart } from "@/components/admin/charts/admin-dashboard-workspace-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { EscalationTrendPoint } from "@/lib/admin/escalations"
import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

// Prop types for these charts (never exported by lib/admin/escalations; shapes follow the usage below).
type AdminEscalationReasonBar = { label: string; count: number }
type AdminEscalationEvolutionPoint = EscalationTrendPoint

const cardClass = cn(adminSurfaces.card, "overflow-hidden border-primary/12 shadow-sm")
const sectionTitle = "text-sm font-medium text-foreground"
const sectionSubtitle = "mt-0.5 text-[11px] text-muted-foreground"

const reasonConfig = {
  count: { label: "Tickets", color: ADMIN_CHART_BLUE.base },
} satisfies ChartConfig

export function AdminEscalationReasonsChart({ data }: { data: AdminEscalationReasonBar[] }) {
  const chartData = data.map((row) => ({ name: row.label, count: row.count }))
  const total = chartData.reduce((sum, row) => sum + row.count, 0)

  return (
    <Card className={cardClass}>
      <CardHeader className="px-4 py-3">
        <CardTitle className={sectionTitle}>Motifs d&apos;escalade</CardTitle>
        <p className={sectionSubtitle}>Origine des orientations N3 FO</p>
      </CardHeader>
      <CardContent className="px-3 pb-4 pt-1">
        {total <= 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Aucune escalade N3 en file.</p>
        ) : (
          <ChartContainer config={reasonConfig} className="h-[220px] w-full min-w-0">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              barCategoryGap="22%"
            >
              <CartesianGrid horizontal={false} {...ADMIN_CHART_GRID} strokeOpacity={0.45} />
              <XAxis type="number" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={148}
                tick={{ ...ADMIN_CHART_TICK, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 3, 3, 0]} maxBarSize={16} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminEscalationEvolutionChart({ data }: { data: AdminEscalationEvolutionPoint[] }) {
  const total = data.reduce((sum, row) => sum + row.escalations, 0)

  return (
    <Card className={cardClass}>
      <CardHeader className="px-4 py-3">
        <CardTitle className={sectionTitle}>Évolution des escalades</CardTitle>
        <p className={sectionSubtitle}>Volume N3 sur 7 jours</p>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-1">
        {total <= 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Aucune escalade sur la période.</p>
        ) : (
          <AdminEscalationTrendChart data={data} />
        )}
      </CardContent>
    </Card>
  )
}
