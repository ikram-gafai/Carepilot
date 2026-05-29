import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Flat investigation section — minimal chrome, operational readability. */
export function TicketInvestigationSection({
  title,
  children,
  className,
  compact,
}: {
  title: string
  children: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <section className={cn("border-b border-border/60 pb-4 last:border-b-0 last:pb-0", className)}>
      <h2
        className={cn(
          "font-medium tracking-tight text-foreground",
          compact ? "mb-2 text-[11px] uppercase tracking-wide text-muted-foreground" : "mb-2.5 text-xs",
        )}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
