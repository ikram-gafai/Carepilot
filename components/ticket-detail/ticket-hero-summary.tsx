import * as React from "react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Soft pill for perimeter / priority (incident-style header badges). */
export const ticketHeroMetaPillClass =
  "border-transparent bg-slate-100 text-slate-700 text-[10px] font-medium shadow-none hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"

export type TicketHeroMetric = {
  label: string
  value: React.ReactNode
}

type TicketHeroSummaryProps = {
  ticketId: string
  title: string
  badges: React.ReactNode
  metrics: TicketHeroMetric[]
  className?: string
}

export function TicketHeroSummary({
  ticketId,
  title,
  badges,
  metrics,
  className,
}: TicketHeroSummaryProps) {
  return (
    <Card
      className={cn(
        "gap-0 border-border bg-background py-0 shadow-none",
        className
      )}
    >
      <div className="space-y-3 px-4 pt-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {ticketId}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">{badges}</div>
        </div>
        <p className="text-sm text-muted-foreground md:text-base">{title}</p>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="min-w-0 bg-background px-4 py-3.5"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {m.label}
            </div>
            <div className="mt-1 text-sm font-semibold leading-snug text-foreground tabular-nums">
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
