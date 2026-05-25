"use client"

import type { CompactSignalItem } from "@/lib/admin/signal-display"
import { AdminCompactSignalList } from "@/components/admin/ui/admin-compact-signal-list"
import { adminSurfaces } from "@/lib/admin-surface"
import { compactOperationalSignal } from "@/lib/admin/signal-display"
import { cn } from "@/lib/utils"

export function AdminSignalFeed({
  items,
}: {
  items: {
    id: number
    title: string
    detail: string
    severity: string
    category?: string
    detectedAt: Date
  }[]
}) {
  const compact: CompactSignalItem[] = items.map((s) =>
    compactOperationalSignal({
      id: String(s.id),
      severity: s.severity,
      category: s.category ?? s.detail,
      title: s.title,
      detectedAt: s.detectedAt,
    }),
  )

  return (
    <div className={cn(adminSurfaces.list, "max-h-[320px] overflow-y-auto")}>
      <AdminCompactSignalList items={compact} emptyMessage="No signals." />
    </div>
  )
}
