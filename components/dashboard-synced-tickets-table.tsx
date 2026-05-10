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
    title: "Edition facture",
    level: "N2",
    sync: "Synced",
    aiDecision: "Résolution N2 (KM trouvé)",
  },
  {
    id: "1160310",
    title: "SCO NCR 33/34",
    level: "N2",
    sync: "Pending",
    aiDecision: "Escalade vers N3 (pas de KM)",
  },
  {
    id: "1172619",
    title: "Réouverture ticket 117/31614",
    level: "N3",
    sync: "Failed",
    aiDecision: "Traitement N3 (aucun KM disponible)",
  },
  {
    id: "1150001",
    title: "Edition facture - 1150001",
    level: "N2",
    sync: "Synced",
    aiDecision: "Résolution N2 (KM trouvé)",
  },
  {
    id: "1150002",
    title: "SCO NCR 33/34 - 1150002",
    level: "N3",
    sync: "Synced",
    aiDecision: "Traitement N3 (aucun KM disponible)",
  },
  {
    id: "1150003",
    title: "Réouverture ticket 117/31614 - 1150003",
    level: "N2",
    sync: "Synced",
    aiDecision: "Résolution N2 (KM trouvé)",
  },
  {
    id: "1150004",
    title: "Edition facture - 1150004",
    level: "N2",
    sync: "Synced",
    aiDecision: "Résolution N2 (KM trouvé)",
  },
]

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const pill = {
    Synced:
      "bg-sky-100 text-sky-800 dark:bg-sky-950/55 dark:text-sky-200",
    Pending:
      "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200",
    Failed:
      "bg-red-100 text-red-800 dark:bg-red-950/55 dark:text-red-200",
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
          Derniers tickets synchronisés
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
                Titre
              </TableHead>
              <TableHead className="h-9 w-[1%] whitespace-nowrap px-3 text-xs font-medium text-muted-foreground">
                Niveau
              </TableHead>
              <TableHead className="h-9 w-[1%] whitespace-nowrap px-3 text-xs font-medium text-muted-foreground">
                Sync
              </TableHead>
              <TableHead className="h-9 min-w-[180px] px-3 text-xs font-medium text-muted-foreground">
                Décision IA
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
