"use client"

import { AdminAgentWorkloadChart } from "@/components/admin/charts/admin-supervision-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { adminWorkforceSupervision } from "@/lib/queries/admin"
import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

type Data = Awaited<ReturnType<typeof adminWorkforceSupervision>>

const cardClass = cn(adminSurfaces.card, "shadow-sm")
const sectionTitle = "text-sm font-semibold text-foreground"

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className={cn(cardClass, "border-border/70 py-0 pb-0")}>
      <CardContent className="px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function fmtSignIn(d: Date | string | null) {
  if (!d) return "—"
  const date = d instanceof Date ? d : new Date(d)
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(date)
}

export function AdminUsersView({ data }: { data: Data }) {
  const { activeAgents, openAssignments, workloadByAgent, supportAgents } = data

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-4 pb-5">
      <section aria-label="Workforce summary" className="grid gap-2 lg:grid-cols-4">
        <SummaryCard label="Active agents" value={String(activeAgents)} />
        <SummaryCard label="Open assignments" value={String(openAssignments)} />
        <div className="min-h-0 lg:col-span-2">
          <AdminAgentWorkloadChart data={workloadByAgent} />
        </div>
      </section>

      <section aria-label="Support agents">
        <Card className={cardClass}>
          <CardHeader className="border-b border-zinc-200/90 px-4 py-2">
            <CardTitle className={sectionTitle}>Support agents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-100/90 hover:bg-transparent">
                  {["Name", "Email", "Department", "Status", "Last sign-in"].map((h) => (
                    <TableHead
                      key={h}
                      className="h-8 px-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {supportAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-xs text-zinc-500">
                      No support agents found.
                    </TableCell>
                  </TableRow>
                ) : (
                  supportAgents.map((u) => (
                    <TableRow
                      key={u.id}
                      className="border-zinc-100/80 transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="px-4 py-2.5 text-xs font-medium text-foreground">
                        {u.name}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-xs text-zinc-600">{u.email}</TableCell>
                      <TableCell className="px-4 py-2.5 text-xs text-zinc-600">{u.department}</TableCell>
                      <TableCell className="px-4 py-2.5 text-xs capitalize text-zinc-600">{u.status}</TableCell>
                      <TableCell className="px-4 py-2.5 text-xs text-zinc-600">{fmtSignIn(u.lastSignIn)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
