"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"

import type { adminEscalations } from "@/lib/queries/admin"
import { adminSurfaces } from "@/lib/admin-surface"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Data = Awaited<ReturnType<typeof adminEscalations>>
type Row = Data["rows"][number]

const cardClass = cn(adminSurfaces.card, "shadow-sm")

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(d)
}

function SummaryDot() {
  return <span className="text-muted-foreground/40" aria-hidden>·</span>
}

function OperationalSummaryPanel({ summary }: { summary: Data["summary"] }) {
  return (
    <div className={cn(cardClass, "px-4 py-3")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Vue opérationnelle
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-foreground">
        <span>
          <span className="text-muted-foreground">Escalades N3 :</span>{" "}
          <span className="font-semibold tabular-nums">{summary.n3Total}</span>
        </span>
        <SummaryDot />
        <span>
          <span className="text-muted-foreground">Principale cause :</span>{" "}
          <span className="font-medium">{summary.primaryCause}</span>
        </span>
        <SummaryDot />
        <span>
          <span className="text-muted-foreground">Impact SLA :</span>{" "}
          <span className="font-medium tabular-nums">
            {summary.slaAtRisk} ticket{summary.slaAtRisk === 1 ? "" : "s"} à risque
          </span>
        </span>
      </div>
    </div>
  )
}

function AnalysisField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xs leading-snug text-foreground">{value}</dd>
    </div>
  )
}

function EscalationAnalysisPanel({ row }: { row: Row | null }) {
  if (!row) {
    return (
      <Card className={cn(cardClass, "h-full")}>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-sm font-medium text-foreground">Analyse escalade</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground">Sélectionnez un ticket pour afficher l&apos;analyse.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(cardClass, "h-full")}>
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="text-sm font-medium text-foreground">Analyse escalade</CardTitle>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{row.careId}</p>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-3">
        <dl className="space-y-2.5">
          <AnalysisField label="Décision" value={row.analysis.decision} />
          <AnalysisField label="Motif" value={row.analysis.reasonDetail} />
          <AnalysisField label="KM tenté" value={row.kmAttempted ?? "—"} />
          <AnalysisField label="Contexte" value={row.analysis.context} />
          <AnalysisField label="Action requise" value={row.analysis.requiredAction} />
        </dl>
        <Link
          href={`/agent/tickets/${row.ticketId}`}
          className="inline-block text-[11px] font-medium text-primary hover:underline"
        >
          Ouvrir le ticket
        </Link>
      </CardContent>
    </Card>
  )
}

function FrequentReasonsList({ reasons }: { reasons: Data["frequentReasons"] }) {
  if (reasons.length === 0) return null

  return (
    <section aria-label="Motifs fréquents" className={cn(cardClass, "px-4 py-3")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Motifs fréquents</p>
      <ul className="mt-2 divide-y divide-border/50">
        {reasons.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-4 py-1.5 text-xs">
            <span className="text-foreground">{item.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{item.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

const TABLE_ROW_LIMIT = 40

export function AdminEscalationsView({ data }: { data: Data }) {
  const [search, setSearch] = useState("")
  const [reasonFilter, setReasonFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { summary, frequentReasons, rows } = data

  const reasonOptions = useMemo(() => [...new Set(rows.map((r) => r.reason))].sort(), [rows])
  const categoryOptions = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (reasonFilter !== "all" && row.reason !== reasonFilter) return false
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false
      if (!q) return true
      return (
        row.careId.toLowerCase().includes(q) ||
        row.incident.toLowerCase().includes(q) ||
        row.reason.toLowerCase().includes(q) ||
        (row.kmAttempted?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [rows, reasonFilter, categoryFilter, search])

  useEffect(() => {
    if (filteredRows.length === 0) {
      setSelectedId(null)
      return
    }
    if (selectedId == null || !filteredRows.some((r) => r.ticketId === selectedId)) {
      setSelectedId(filteredRows[0]!.ticketId)
    }
  }, [filteredRows])

  const visibleRows = filteredRows.slice(0, TABLE_ROW_LIMIT)
  const truncated = filteredRows.length > TABLE_ROW_LIMIT

  const selectedRow = filteredRows.find((r) => r.ticketId === selectedId) ?? null

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-4 pb-8">
      <OperationalSummaryPanel summary={summary} />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-start">
        <Card className={cardClass}>
          <CardHeader className="space-y-3 border-b border-border/60 px-4 py-3">
            <CardTitle className="text-sm font-medium text-foreground">Tickets escaladés</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher CARE ID, incident…"
                  className="h-8 border-border/60 bg-background pl-8 text-xs shadow-none"
                />
              </div>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger size="sm" className="h-8 w-[11rem] border-border/60 text-xs shadow-none">
                  <SelectValue placeholder="Motif" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les motifs</SelectItem>
                  {reasonOptions.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger size="sm" className="h-8 w-[9.5rem] border-border/60 text-xs shadow-none">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  {["CARE ID", "Incident", "Catégorie", "Motif escalade", "KM", "SLA", "Date"].map((h) => (
                    <TableHead
                      key={h}
                      className={cn(
                        "h-9 px-3 text-xs font-medium text-muted-foreground",
                        h === "Date" && "text-right",
                      )}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-xs text-muted-foreground">
                      Aucun ticket escaladé ne correspond aux filtres.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row) => {
                    const selected = row.ticketId === selectedId
                    return (
                      <TableRow
                        key={row.ticketId}
                        data-state={selected ? "selected" : undefined}
                        className={cn(
                          "cursor-pointer border-border/50",
                          selected ? "bg-primary/[0.06]" : "hover:bg-muted/20",
                        )}
                        onClick={() => setSelectedId(row.ticketId)}
                      >
                        <TableCell className="px-3 py-2.5 font-mono text-xs font-medium text-foreground">
                          {row.careId}
                        </TableCell>
                        <TableCell className="max-w-[12rem] px-3 py-2.5 text-xs text-foreground">
                          <span className="line-clamp-2">{row.incident}</span>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-xs text-muted-foreground">{row.category}</TableCell>
                        <TableCell className="px-3 py-2.5 text-xs text-foreground">{row.reason}</TableCell>
                        <TableCell className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                          {row.kmAttempted ?? "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "px-3 py-2.5 text-xs",
                            row.slaAtRisk ? "font-medium text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {row.slaLabel}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                          {fmtDate(row.createdAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            {truncated ? (
              <p className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
                Affichage limité aux {TABLE_ROW_LIMIT} premiers résultats ({filteredRows.length} au total).
              </p>
            ) : null}
          </CardContent>
        </Card>

        <EscalationAnalysisPanel row={selectedRow} />
      </div>

      <FrequentReasonsList reasons={frequentReasons} />
    </div>
  )
}
