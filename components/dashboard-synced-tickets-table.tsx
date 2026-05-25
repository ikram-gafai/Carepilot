import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type SyncStatus = "Synced" | "Pending" | "Failed"

const DEMO_ROWS: {
  id: string
  title: string
  level: string
  sync: SyncStatus
  aiDecision: string
}[] = [
  {
    id: "1140821",
    title: "Invoice edit",
    level: "N2",
    sync: "Synced",
    aiDecision: "N2 resolution (KM found)",
  },
  {
    id: "1160310",
    title: "SCO NCR 33/34",
    level: "N2",
    sync: "Pending",
    aiDecision: "Escalation to N3 (no KM)",
  },
  {
    id: "1172619",
    title: "Reopened ticket 117/31614",
    level: "N3",
    sync: "Failed",
    aiDecision: "N3 handling (no KM available)",
  },
  {
    id: "1150001",
    title: "Invoice edit - 1150001",
    level: "N2",
    sync: "Synced",
    aiDecision: "N2 resolution (KM found)",
  },
  {
    id: "1150002",
    title: "SCO NCR 33/34 - 1150002",
    level: "N3",
    sync: "Synced",
    aiDecision: "N3 handling (no KM available)",
  },
  {
    id: "1150003",
    title: "Reopened ticket 117/31614 - 1150003",
    level: "N2",
    sync: "Synced",
    aiDecision: "N2 resolution (KM found)",
  },
  {
    id: "1150004",
    title: "Invoice edit - 1150004",
    level: "N2",
    sync: "Synced",
    aiDecision: "N2 resolution (KM found)",
  },
]

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const pill = {
    Synced:
      "bg-primary/12 text-foreground dark:bg-primary/18 dark:text-foreground",
    Pending:
      "bg-muted text-muted-foreground dark:bg-muted/80 dark:text-muted-foreground",
    Failed:
      "bg-destructive/12 text-destructive dark:bg-destructive/18 dark:text-destructive",
  } satisfies Record<SyncStatus, string>

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        pill[status]
      )}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full bg-current opacity-90"
      />
      {status}
    </span>
  )
}

/** Demo-only table — replace with API data when sync listing is wired. */
export function DashboardSyncedTicketsTable() {
  return (
    <Card className="border-border bg-background shadow-none">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="text-sm font-semibold">
          Latest synced tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 w-[1%] whitespace-nowrap px-3 text-xs font-medium text-muted-foreground">
                ID
              </TableHead>
              <TableHead className="h-9 min-w-[140px] px-3 text-xs font-medium text-muted-foreground">
                Title
              </TableHead>
              <TableHead className="h-9 w-[1%] whitespace-nowrap px-3 text-xs font-medium text-muted-foreground">
                Level
              </TableHead>
              <TableHead className="h-9 w-[1%] whitespace-nowrap px-3 text-xs font-medium text-muted-foreground">
                Sync
              </TableHead>
              <TableHead className="h-9 min-w-[180px] px-3 text-xs font-medium text-muted-foreground">
                AI decision
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_ROWS.map((row) => (
              <TableRow key={row.id} className="text-xs hover:bg-transparent">
                <TableCell className="px-3 py-2.5 tabular-nums">
                  <Link
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    href={`/tickets/${row.id}`}
                  >
                    {row.id}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[280px] px-3 py-2.5 whitespace-normal text-foreground">
                  {row.title}
                </TableCell>
                <TableCell className="px-3 py-2.5 tabular-nums text-foreground">
                  {row.level}
                </TableCell>
                <TableCell className="px-3 py-2 align-middle whitespace-nowrap">
                  <SyncStatusBadge status={row.sync} />
                </TableCell>
                <TableCell className="max-w-[320px] px-3 py-2.5 whitespace-normal text-foreground">
                  {row.aiDecision}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
