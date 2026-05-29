import { cn } from "@/lib/utils"
import type { DashboardMetrics } from "@/lib/queries/dashboard-metrics"

const SCREENSHOT = {
  tickets: "58",
  ticketsHint: "current active backlog",
  sla: "6",
  slaHint: "near breach or overdue",
  escalations: "12",
  escalationsHint: "AI escalation prediction",
  transfers: "11",
  transfersHint: "cross-perimeter suggestions",
} as const

const SPARK_TICKETS = [12, 18, 15, 22, 20, 28, 24, 32, 30, 38] as const
const SPARK_SLA = [4, 5, 4, 6, 5, 7, 6, 8, 7, 9] as const
const SPARK_ESC = [8, 9, 10, 9, 11, 12, 11, 13, 12, 14] as const
const SPARK_TRANS = [6, 7, 8, 8, 9, 10, 9, 11, 10, 12] as const

function Sparkline({
  points,
  gradientId,
  className,
}: {
  points: readonly number[]
  gradientId: string
  className?: string
}) {
  const w = 100
  const h = 40
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const padX = 2
  const padY = 4
  const n = points.length
  const linePts = points.map((p, i) => {
    const x = padX + (n <= 1 ? w / 2 : (i / (n - 1)) * (w - padX * 2))
    const y = padY + (1 - (p - min) / span) * (h - padY * 2)
    return [x, y] as const
  })
  const pathD = linePts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ")
  const [lx, ly] = linePts[linePts.length - 1]!
  const [fx, fy] = linePts[0]!
  const areaD = `${pathD} L ${lx} ${h - padY} L ${fx} ${h - padY} Z`

  return (
    <svg
      aria-hidden
      className={cn("shrink-0 text-primary", className)}
      viewBox={`0 0 ${w} ${h}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function KpiTile({
  title,
  value,
  hint,
  points,
  gradientId,
}: {
  title: string
  value: string
  hint: string
  points: readonly number[]
  gradientId: string
}) {
  return (
    <div className="flex min-h-[100px] flex-row items-end justify-between gap-3 rounded-xl border border-border bg-background p-4 shadow-none">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-[34px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        <p className="pt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
      </div>
      <Sparkline className="h-10 w-[104px]" gradientId={gradientId} points={points} />
    </div>
  )
}

export function DashboardHeroKpiRow({
  metrics,
}: {
  metrics?: DashboardMetrics | null
}) {
  const live = metrics != null
  const tickets = live ? String(metrics.openTickets) : SCREENSHOT.tickets
  const sla = live ? String(metrics.slaAtRisk) : SCREENSHOT.sla
  const escalations = live ? String(metrics.escalations) : SCREENSHOT.escalations
  const transfers = live ? String(metrics.transfers) : SCREENSHOT.transfers

  return (
    <section aria-label="Key metrics">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          gradientId="cp-dash-spark-tickets"
          hint={SCREENSHOT.ticketsHint}
          points={SPARK_TICKETS}
          title="Tickets"
          value={tickets}
        />
        <KpiTile
          gradientId="cp-dash-spark-sla"
          hint={SCREENSHOT.slaHint}
          points={SPARK_SLA}
          title="SLA Critical"
          value={sla}
        />
        <KpiTile
          gradientId="cp-dash-spark-esc"
          hint={SCREENSHOT.escalationsHint}
          points={SPARK_ESC}
          title="Escalations"
          value={escalations}
        />
        <KpiTile
          gradientId="cp-dash-spark-trans"
          hint={SCREENSHOT.transfersHint}
          points={SPARK_TRANS}
          title="Transfers"
          value={transfers}
        />
      </div>
    </section>
  )
}
