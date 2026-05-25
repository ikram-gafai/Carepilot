"use client"

import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

export type SupervisionSignalRow = {
  label: string
  value: string
}

export type SupervisionSignalTone = "critical" | "primary" | "success" | "neutral"

const TONE_DOT: Record<SupervisionSignalTone, string> = {
  critical: "bg-destructive shadow-[0_0_0_2px] shadow-destructive/20",
  primary: "bg-primary shadow-[0_0_0_2px] shadow-primary/25",
  success: "bg-emerald-500 shadow-[0_0_0_2px] shadow-emerald-500/20",
  neutral: "bg-zinc-300",
}

export function AdminSupervisionSignalCard({
  title,
  rows,
  tone = "primary",
}: {
  title: string
  rows: readonly SupervisionSignalRow[]
  tone?: SupervisionSignalTone
}) {
  return (
    <article
      className={cn(
        adminSurfaces.card,
        "flex flex-col overflow-hidden border-primary/15 bg-gradient-to-b from-primary/[0.04] to-card",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-primary/10 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        <span className={cn("size-2 shrink-0 rounded-full", TONE_DOT[tone])} aria-hidden />
      </header>
      <dl className="grid flex-1 gap-0 divide-y divide-border/50 px-4 py-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="max-w-[58%] truncate text-right text-xs font-semibold tabular-nums text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
