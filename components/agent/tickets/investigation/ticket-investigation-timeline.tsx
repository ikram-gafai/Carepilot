import type { InvestigationTimelineEntry } from "@/lib/agent/investigation-timeline"
import { cn } from "@/lib/utils"

import { InvestigationSection } from "./investigation-section"

const TONE_DOT: Record<InvestigationTimelineEntry["tone"], string> = {
  default: "bg-muted-foreground/70",
  ai: "bg-primary",
  sla: "bg-amber-500",
  escalation: "bg-destructive",
  transfer: "bg-primary/60",
  agent: "bg-emerald-600",
  km: "bg-sky-600",
}

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

export function TicketInvestigationTimeline({ entries }: { entries: InvestigationTimelineEntry[] }) {
  return (
    <InvestigationSection title="Chronologie investigation">
      <ol className="divide-y divide-border/40">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
            <span
              className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[entry.tone])}
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-[11px] font-medium text-foreground">{entry.label}</span>
            <time className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
              {formatWhen(entry.occurredAt)}
            </time>
          </li>
        ))}
      </ol>
    </InvestigationSection>
  )
}
