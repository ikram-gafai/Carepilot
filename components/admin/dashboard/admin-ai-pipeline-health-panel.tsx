"use client"

import type { AiPipelineHealthRow } from "@/lib/admin/ai-pipeline-health"
import { AI_PIPELINE_LABELS } from "@/lib/operational-ui-copy"
import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

function coverageTone(pct: number): string {
  if (pct >= 90) return "bg-emerald-500"
  if (pct >= 60) return "bg-primary"
  if (pct >= 30) return "bg-amber-500"
  return "bg-destructive/80"
}

function CoverageRow({ row }: { row: AiPipelineHealthRow }) {
  return (
    <div className="space-y-1.5 py-3 first:pt-1 last:pb-1">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">{row.label}</p>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold tabular-nums text-foreground">
            {row.completed} / {row.total}
          </p>
          <p className="text-[11px] font-medium tabular-nums text-muted-foreground">{row.pct}%</p>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn("h-full rounded-full transition-[width]", coverageTone(row.pct))}
          style={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }}
          role="presentation"
        />
      </div>
    </div>
  )
}

export function AdminAiPipelineHealthPanel({
  rows,
}: {
  rows: readonly AiPipelineHealthRow[]
}) {
  return (
    <article
      className={cn(
        adminSurfaces.card,
        "flex flex-col overflow-hidden border-border/80 bg-card shadow-sm",
      )}
    >
      <header className="border-b border-border/60 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{AI_PIPELINE_LABELS.title}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {AI_PIPELINE_LABELS.subtitle}
        </p>
      </header>
      <div className="divide-y divide-border/50 px-4 py-1">
        {rows.map((row) => (
          <CoverageRow key={row.label} row={row} />
        ))}
      </div>
    </article>
  )
}
