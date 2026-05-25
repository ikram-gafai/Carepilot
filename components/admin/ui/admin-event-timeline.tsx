"use client"

import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

const TYPE_COLOR: Record<string, string> = {
  sync: "bg-blue-500",
  queue: "bg-amber-500",
  escalation: "bg-red-500",
  ai: "bg-violet-500",
  ingestion: "bg-blue-400",
}

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(d)
}

export function AdminEventTimeline({
  items,
}: {
  items: { id: number; eventType: string; summary: string; detail: string | null; occurredAt: Date }[]
}) {
  return (
    <ol className={cn(adminSurfaces.list, "max-h-[320px] overflow-y-auto")}>
      {items.map((e) => (
        <li key={e.id} className="relative flex gap-3 px-3 py-2.5 hover:bg-zinc-50/80">
          <span
            className={cn(
              "mt-1 size-2 shrink-0 rounded-full",
              TYPE_COLOR[e.eventType] ?? "bg-zinc-400",
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1 border-l border-zinc-100 pl-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-medium text-zinc-800">{e.summary}</p>
              <span className="shrink-0 font-mono text-[9px] text-zinc-400">{fmtTime(e.occurredAt)}</span>
            </div>
            {e.detail ? (
              <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-500">{e.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
