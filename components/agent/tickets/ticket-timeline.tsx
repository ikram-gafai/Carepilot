import type { InferSelectModel } from "drizzle-orm"

import { cpAgentTicketHistory } from "@/lib/db/schema/cp-agent"
import { cn } from "@/lib/utils"

type HistoryRow = InferSelectModel<typeof cpAgentTicketHistory>

const eventLabel: Record<string, string> = {
  created: "Créé",
  assignment: "Assignation",
  ai_recommendation: "Analyse IA générée",
  ai_analysis: "Analyse IA générée",
  escalation: "Escalade",
  suspension: "Suspension",
  transfer: "Transfert",
  resolution: "Résolution",
  resolve: "Résolution",
  suspend: "Suspension",
  transfer_mat: "Transfert",
  transfer_bur: "Transfert",
  escalate: "Escalade",
  comment: "Commentaire",
}

function eventPillClass(type: string) {
  switch (type) {
    case "ai_recommendation":
      return "border-primary/35 bg-primary/10 text-foreground"
    case "escalate":
    case "escalation":
      return "border-destructive/35 bg-destructive/10 text-destructive"
    case "transfer_mat":
    case "transfer_bur":
    case "transfer":
      return "border-border bg-muted/50 text-foreground"
    case "suspend":
    case "suspension":
      return "border-border bg-muted/40 text-muted-foreground"
    case "resolve":
    case "resolution":
      return "border-border bg-muted/40 text-foreground"
    default:
      return "border-border bg-background text-muted-foreground"
  }
}

function formatDt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

export function TicketTimeline({ events }: { events: HistoryRow[] }) {
  if (!events.length) {
    return <p className="text-xs text-muted-foreground">Aucun événement dans la chronologie.</p>
  }

  return (
    <ol className="relative ms-2 border-l border-border pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative pb-4 last:pb-0">
          <div
            className={cn(
              "absolute -left-[22px] top-1.5 size-2.5 rounded-full border-2 border-background ring-1",
              e.eventType === "ai_recommendation" && "bg-primary ring-primary/40",
              (e.eventType === "escalate" || e.eventType === "escalation") && "bg-destructive ring-destructive/40",
              !["ai_recommendation", "escalate", "escalation"].includes(e.eventType) && "bg-muted-foreground ring-border",
            )}
          />
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <span
              className={cn(
                "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                eventPillClass(e.eventType),
              )}
            >
              {eventLabel[e.eventType] ?? e.eventType}
            </span>
            <time className="text-[11px] tabular-nums text-muted-foreground">{formatDt(e.occurredAt)}</time>
          </div>
          <div className="mt-1 text-sm font-medium leading-snug text-foreground">{e.summary}</div>
          {e.detail ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{e.detail}</p> : null}
          <div className="mt-1 text-[11px] font-medium text-muted-foreground">{e.actorLabel}</div>
        </li>
      ))}
    </ol>
  )
}
