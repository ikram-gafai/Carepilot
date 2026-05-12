import type { ComponentType } from "react"

import {
  IconActivity,
  IconAlertTriangle,
  IconArrowBackUp,
  IconBook,
  IconBuildingSkyscraper,
  IconCheck,
  IconCircleCheck,
  IconCpu,
  IconCreditCard,
  IconInbox,
  IconNetwork,
  IconPrinter,
  IconReceipt,
  IconRouter,
  IconStethoscope,
  IconTopologyRing,
  IconUsers,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const topologyGridClass =
  "rounded-xl border border-border/80 bg-muted/30 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_42%,transparent)_1px,transparent_1px)] bg-[length:22px_22px] dark:bg-muted/15"

/** CarePilot brand border on operational topology perimeter tiles (white fill) */
const operationalTopologyBrandAccent =
  "border border-primary/35 dark:border-primary/45"
const operationalTopologyBrandIcon = "text-primary"

function TopologyPerimeterCard({
  title,
  value,
  caption,
  icon: Icon,
  accentClass,
  iconClassName,
  className,
}: {
  title: string
  value: string
  caption: string
  icon: ComponentType<{ className?: string }>
  accentClass: string
  iconClassName?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "max-w-[156px] rounded-lg border border-border/80 bg-white px-3 py-2.5 shadow-sm dark:bg-card",
        accentClass,
        className
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50 shadow-sm ring-1 ring-border/60",
            iconClassName
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight text-foreground">{title}</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
        </div>
      </div>
      <p className="mt-1.5 pl-0.5 text-[10px] leading-snug text-muted-foreground">{caption}</p>
    </div>
  )
}

const LIVE_DECISIONS = [
  {
    id: "INC-2025-0148",
    text: "Traitement N2 validated after KM execution",
    status: "Validated",
    emphasis: true,
    rowTint: "border-l-[3px] border-l-emerald-600 bg-emerald-500/[0.07]",
    badgeClass:
      "border-emerald-600/45 bg-emerald-600 text-white shadow-sm hover:bg-emerald-600/90 dark:bg-emerald-700 dark:text-white",
    StatusIcon: IconCircleCheck,
  },
  {
    id: "INC-2025-0192",
    text: "Payment cluster correlation accepted by routing engine",
    status: "Accepted",
    emphasis: false,
    rowTint: "border-l-[3px] border-l-chart-1 bg-chart-1/[0.07]",
    badgeClass: "border-chart-1/35 bg-chart-1/15 text-chart-3 dark:bg-chart-1/20 dark:text-foreground",
    StatusIcon: IconCheck,
  },
  {
    id: "INC-2025-0201",
    text: "Hardware transfer dependency overridden after N2 review",
    status: "Overridden",
    emphasis: false,
    rowTint: "border-l-[3px] border-l-amber-500/80 bg-amber-500/[0.07]",
    badgeClass:
      "border-amber-500/40 bg-amber-500/12 text-amber-950 dark:bg-amber-500/15 dark:text-amber-100",
    StatusIcon: IconArrowBackUp,
  },
  {
    id: "INC-2025-0187",
    text: "SCO synchronization pattern validated against live perimeter",
    status: "Validated",
    emphasis: true,
    rowTint: "border-l-[3px] border-l-emerald-600 bg-emerald-500/[0.07]",
    badgeClass:
      "border-emerald-600/45 bg-emerald-600 text-white shadow-sm hover:bg-emerald-600/90 dark:bg-emerald-700 dark:text-white",
    StatusIcon: IconCircleCheck,
  },
  {
    id: "INC-2025-0175",
    text: "Network escalation chain accepted — cross-store linkage",
    status: "Accepted",
    emphasis: false,
    rowTint: "border-l-[3px] border-l-chart-1 bg-chart-1/[0.07]",
    badgeClass: "border-chart-1/35 bg-chart-1/15 text-chart-3 dark:bg-chart-1/20 dark:text-foreground",
    StatusIcon: IconCheck,
  },
] as const

const CORRELATION_CLUSTERS = [
  {
    title: "Printer instability cluster",
    description: "same printer operational signature — repeated KM usage",
    count: "12 linked tickets",
    Icon: IconPrinter,
  },
  {
    title: "SCO synchronization cluster",
    description: "shared payment failure behavior across stores",
    count: "8 linked tickets",
    Icon: IconCreditCard,
  },
  {
    title: "Network escalation chain",
    description: "same dependency detected before N3 escalation",
    count: "5 linked tickets",
    Icon: IconNetwork,
  },
  {
    title: "Receipt procedure failure",
    description: "same KM failure after execution validation",
    count: "4 linked tickets",
    Icon: IconReceipt,
  },
] as const

const ESCALATION_STAGES = [
  {
    title: "Incoming backlog",
    subtitle: "live operational stage",
    value: "58",
    Icon: IconInbox,
    valueClass: "text-chart-1",
  },
  {
    title: "Diagnostic validation",
    subtitle: "live operational stage",
    value: "41",
    Icon: IconStethoscope,
    valueClass: "text-chart-2",
  },
  {
    title: "KM applicable",
    subtitle: "live operational stage",
    value: "27",
    Icon: IconBook,
    valueClass: "text-chart-3",
  },
  {
    title: "Traitement N2",
    subtitle: "live operational stage",
    value: "32",
    Icon: IconUsers,
    valueClass: "text-chart-4",
  },
  {
    title: "Escalade N3",
    subtitle: "live operational stage",
    value: "12",
    Icon: IconAlertTriangle,
    valueClass: "text-chart-5",
  },
] as const

const analyticsPageCardClassName =
  "gap-0 overflow-hidden border-border bg-white py-0 shadow-sm ring-1 ring-border/40 dark:bg-card"

export function AnalyticsOperationalOverview() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={analyticsPageCardClassName}>
          <CardHeader className="items-center border-b border-border pt-4 pb-3">
            <CardTitle className="text-sm font-semibold">Operational Topology</CardTitle>
            <CardAction className="self-center">
              <Badge
                variant="outline"
                className="gap-1 border-primary/35 bg-primary/10 font-normal text-primary"
              >
                <IconActivity className="size-3.5 text-primary" />
                Live Monitoring
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="pb-6">
            <div className={cn("relative overflow-hidden px-2 py-6", topologyGridClass)}>
              <div className="pointer-events-none absolute inset-x-8 top-[22%] hidden h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent md:block" />
              <div className="pointer-events-none absolute inset-x-8 bottom-[22%] hidden h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent md:block" />

              <div className="relative z-1 mx-auto flex max-w-xl flex-col items-center gap-6">
                <div className="flex w-full justify-between gap-3 px-1 md:px-4">
                  <TopologyPerimeterCard
                    title="FO / FLP"
                    value="82"
                    caption="critical operational pressure"
                    icon={IconBuildingSkyscraper}
                    accentClass={operationalTopologyBrandAccent}
                    iconClassName={operationalTopologyBrandIcon}
                  />
                  <TopologyPerimeterCard
                    title="SCO"
                    value="64"
                    caption="payment instability cluster"
                    icon={IconCreditCard}
                    accentClass={operationalTopologyBrandAccent}
                    iconClassName={operationalTopologyBrandIcon}
                  />
                </div>

                <div className="flex h-44 w-44 flex-col items-center justify-center rounded-full border-[5px] border-primary bg-gradient-to-br from-primary/18 via-background to-primary/10 text-center shadow-lg ring-2 ring-primary/25 ring-offset-2 ring-offset-background">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    CarePilot
                  </span>
                  <span className="bg-gradient-to-br from-primary to-primary/75 bg-clip-text text-4xl font-semibold tabular-nums tracking-tight text-transparent">
                    58
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IconActivity className="size-3.5 text-primary" aria-hidden />
                    active tickets
                  </span>
                </div>

                <div className="flex w-full justify-between gap-3 px-1 md:px-4">
                  <TopologyPerimeterCard
                    title="HARDWARE"
                    value="27"
                    caption="transfer dependency"
                    icon={IconCpu}
                    accentClass={operationalTopologyBrandAccent}
                    iconClassName={operationalTopologyBrandIcon}
                  />
                  <TopologyPerimeterCard
                    title="NETWORK"
                    value="41"
                    caption="cross-store incidents"
                    icon={IconRouter}
                    accentClass={operationalTopologyBrandAccent}
                    iconClassName={operationalTopologyBrandIcon}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={analyticsPageCardClassName}>
          <CardHeader className="items-center border-b border-border pt-4 pb-3">
            <CardTitle className="text-sm font-semibold">Live Decision Stream</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {LIVE_DECISIONS.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 sm:flex-nowrap sm:items-center",
                  row.rowTint
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-foreground">
                    <span className="inline-block size-1.5 shrink-0 rounded-full bg-chart-3" aria-hidden />
                    {row.id}
                  </p>
                  <p className="text-xs leading-snug text-muted-foreground">{row.text}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("shrink-0 gap-1 border font-normal", row.badgeClass)}
                >
                  <row.StatusIcon
                    className={cn(
                      "size-3.5 opacity-90",
                      row.emphasis && "text-white"
                    )}
                  />
                  {row.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_1fr]">
        <Card className={analyticsPageCardClassName}>
          <CardHeader className="items-center border-b border-border pt-4 pb-3">
            <CardTitle className="text-sm font-semibold">Incident Correlation Clusters</CardTitle>
            <CardAction className="self-center">
              <Badge
                variant="outline"
                className="gap-1 border-border bg-background font-normal text-muted-foreground"
              >
                <IconTopologyRing className="size-3.5 text-muted-foreground" />
                Correlation Engine
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3 py-4">
            {CORRELATION_CLUSTERS.map((c) => (
              <div
                key={c.title}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-white px-4 py-3 sm:flex-nowrap sm:items-center dark:bg-card"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-foreground ring-1 ring-border/60">
                    <c.Icon className="size-5 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-foreground">{c.title}</p>
                    <p className="text-xs leading-snug text-muted-foreground">{c.description}</p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="shrink-0 border border-border/60 bg-background/80 font-normal"
                >
                  {c.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={analyticsPageCardClassName}>
          <CardHeader className="items-center border-b border-border pt-4 pb-3">
            <CardTitle className="text-sm font-semibold">Escalation Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 py-4">
            {ESCALATION_STAGES.map((stage) => (
              <div
                key={stage.title}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-4 py-3 sm:flex-nowrap dark:bg-card"
              >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-foreground ring-1 ring-border/60">
                      <stage.Icon className="size-5 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{stage.title}</p>
                      <p className="text-xs text-muted-foreground">{stage.subtitle}</p>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-2xl font-semibold tabular-nums tracking-tight",
                      stage.valueClass
                    )}
                  >
                    {stage.value}
                  </p>
                </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
