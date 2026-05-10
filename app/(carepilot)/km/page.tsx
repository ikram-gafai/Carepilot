import { asc } from "drizzle-orm"

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
import { kmProcedures } from "@/lib/db/schema/care-source"

export default async function KmPage() {
  let rows: (typeof kmProcedures.$inferSelect)[] = []
  let error: string | null = null

  try {
    const db = getDb()
    rows = await db.select().from(kmProcedures).orderBy(asc(kmProcedures.kmCode))
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">KM Procedures</h1>
        <p className="text-xs text-muted-foreground">
          Catalogue simulateur — CAREPILOT ne génère pas de nouvelles procédures.
        </p>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <Card className="border-border bg-background shadow-none">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">Procédures ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-xs">Code</TableHead>
                  <TableHead className="h-9 text-xs">Titre</TableHead>
                  <TableHead className="h-9 text-xs">Périmètre</TableHead>
                  <TableHead className="h-9 text-xs">Catégorie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="text-xs">
                    <TableCell className="py-2 font-mono text-[11px]">{r.kmCode}</TableCell>
                    <TableCell className="py-2">{r.title}</TableCell>
                    <TableCell className="py-2">{r.perimeter}</TableCell>
                    <TableCell className="py-2">{r.category}</TableCell>
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
