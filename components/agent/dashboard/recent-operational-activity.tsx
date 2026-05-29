import Link from "next/link"

import { QUEUE_SECTIONS } from "@/lib/ai/decision-support-terminology"
import type { AgentActivityRow } from "@/lib/carepilot-api/agent-dashboard-data"
import { cn } from "@/lib/utils"

function formatFeedTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso))
}

export function RecentOperationalActivity({ activity }: { activity: AgentActivityRow[] }) {
  return (
    <section className="rounded-md border border-border/80 bg-card">
      <div className="border-b border-border/70 px-3 py-2">
        <h2 className="text-sm font-medium text-foreground">{QUEUE_SECTIONS.recentActivity}</h2>
        <p className="text-[10px] text-muted-foreground">{QUEUE_SECTIONS.recentActivityHint}</p>
      </div>
      {activity.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">Aucun événement récent en file.</p>
      ) : (
        <ol className="relative px-3 py-2">
          {activity.map((event, index) => (
            <li
              key={event.id}
              className={cn(
                "relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2 pb-2 last:pb-0",
                index < activity.length - 1 && "mb-0.5",
              )}
            >
              {index < activity.length - 1 ? (
                <span
                  className="absolute left-[1.3125rem] top-[0.625rem] h-[calc(100%-0.125rem)] w-px bg-border/70"
                  aria-hidden
                />
              ) : null}
              <time
                dateTime={event.occurredAt}
                className="pt-0.5 text-[11px] tabular-nums text-muted-foreground"
              >
                {formatFeedTime(event.occurredAt)}
              </time>
              <div className="relative min-w-0 pl-3">
                <span
                  className="absolute -left-[0.1875rem] top-[0.4375rem] size-1.5 rounded-full border border-border bg-background"
                  aria-hidden
                />
                <p className="truncate text-xs leading-snug">
                  <Link
                    href={`/agent/tickets/${event.ticketId}`}
                    className="font-mono text-[11px] text-foreground/90 underline-offset-2 hover:text-primary hover:underline"
                  >
                    {event.careId}
                  </Link>
                  <span className="text-muted-foreground/60"> · </span>
                  <span className="text-foreground/80">{event.label}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
