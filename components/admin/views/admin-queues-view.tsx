"use client"

import { useState } from "react"

import { AdminQueueHealthBadge } from "@/components/admin/ui/admin-queue-health-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { adminQueueSupervision } from "@/lib/queries/admin"
import type { QueueSupervisionRow } from "@/lib/admin/queue-metrics"
import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

type Data = Awaited<ReturnType<typeof adminQueueSupervision>>

const cardClass = cn(adminSurfaces.card, "shadow-sm")

function metricClass(value: number, kind: "sla" | "n3") {
  if (value <= 0) return "font-mono text-xs tabular-nums text-foreground"
  if (kind === "n3") return "font-mono text-xs font-medium tabular-nums text-destructive"
  return "font-mono text-xs tabular-nums text-foreground"
}

export function AdminQueuesView({ data }: { data: Data }) {
  const { rows } = data
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-[1600px] p-4 pb-6">
      <Card className={cardClass}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100 hover:bg-transparent">
                {["File", "Ouverts", "Risque SLA", "Escalade N3", "Transferts", "Tendance", "État"].map((h) => (
                  <TableHead
                    key={h}
                    className="h-9 px-4 text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <QueueTableRow
                  key={r.category}
                  row={r}
                  selected={selected === r.category}
                  onSelect={() => setSelected((c) => (c === r.category ? null : r.category))}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function QueueTableRow({
  row,
  selected,
  onSelect,
}: {
  row: QueueSupervisionRow
  selected: boolean
  onSelect: () => void
}) {
  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className={cn(
        "cursor-pointer border-border/80 transition-colors hover:bg-muted/40",
        selected && "bg-primary/[0.04]",
      )}
      onClick={onSelect}
    >
      <TableCell className="px-4 py-2.5 text-xs font-medium text-foreground">{row.name}</TableCell>
      <TableCell className="px-4 py-2.5 font-mono text-xs tabular-nums">{row.open}</TableCell>
      <TableCell className={cn("px-4 py-2.5", metricClass(row.slaRisk, "sla"))}>{row.slaRisk}</TableCell>
      <TableCell className={cn("px-4 py-2.5", metricClass(row.escalateN3, "n3"))}>{row.escalateN3}</TableCell>
      <TableCell className="px-4 py-2.5 font-mono text-xs tabular-nums">{row.transfers}</TableCell>
      <TableCell className="px-4 py-2.5 text-[11px] text-zinc-600">{row.trend}</TableCell>
      <TableCell className="px-4 py-2.5">
        <AdminQueueHealthBadge health={row.health} />
      </TableCell>
    </TableRow>
  )
}
