"use client"

import type { CompactSignalItem } from "@/lib/admin/signal-display"
import { severityLabel } from "@/lib/admin/signal-display"
import { cn } from "@/lib/utils"

const SEVERITY_CLASS: Record<CompactSignalItem["severity"], string> = {
  critical: "text-red-600 dark:text-red-400",
  warning: "text-amber-700 dark:text-amber-500",
  info: "text-blue-700 dark:text-blue-400",
}

function formatRelativeTime(d: Date) {
  const sec = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function AdminCompactSignalList({
  items,
  emptyMessage = "No signals in the current window.",
}: {
  items: CompactSignalItem[]
  emptyMessage?: string
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 py-2.5 first:pt-1">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                SEVERITY_CLASS[item.severity],
              )}
            >
              {severityLabel(item.severity)}
            </p>
            <p className="text-sm font-medium text-foreground">
              {item.title}
              <span className="text-muted-foreground"> · </span>
              <span className="font-normal text-foreground">{item.area}</span>
            </p>
          </div>
          <time
            dateTime={item.at.toISOString()}
            className="shrink-0 pt-3.5 text-xs tabular-nums text-muted-foreground"
          >
            {formatRelativeTime(item.at)}
          </time>
        </li>
      ))}
    </ul>
  )
}
