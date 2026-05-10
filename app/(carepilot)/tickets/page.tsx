import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDb } from "@/lib/db"
import { listRecentTickets } from "@/lib/queries/ticket-list"

export default async function TicketsPage() {
  let rows: Awaited<ReturnType<typeof listRecentTickets>> = []
  let error: string | null = null

  try {
    const db = getDb()
    rows = await listRecentTickets(db, 150)
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Tickets FO VLP</h1>
        <p className="text-xs text-muted-foreground">
          File opérationnelle — données synchronisées vers CAREPILOT.
        </p>
      </div>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <Card className="border-border bg-background shadow-none">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">Queue ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-xs">Réf. CARE</TableHead>
                  <TableHead className="h-9 text-xs">Titre</TableHead>
                  <TableHead className="h-9 text-xs">Statut</TableHead>
                  <TableHead className="h-9 text-xs">Priorité</TableHead>
                  <TableHead className="h-9 text-xs text-right">MàJ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="text-xs">
                    <TableCell className="py-2 font-mono text-[11px]">
                      <Link className="text-primary underline-offset-2 hover:underline" href={`/tickets/${r.id}`}>
                        {r.careTicketId}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate py-2">{r.title}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">{r.priority}</TableCell>
                    <TableCell className="py-2 text-right text-muted-foreground tabular-nums">
                      {new Date(r.updatedAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
