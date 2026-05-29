"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import type { AdminRecommendationsData } from "@/lib/admin/recommendation-audit-types"
import {
  matchesRecommendationDecisionFilter,
  type AdminRecommendationDecisionFilter,
} from "@/lib/admin/recommendation-audit-types"
import { adminSurfaces } from "@/lib/admin-surface"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Data = AdminRecommendationsData
type Row = Data["rows"][number]

const cardClass = cn(adminSurfaces.card, "shadow-sm")

function SummaryDot() {
  return <span className="text-muted-foreground/40" aria-hidden>·</span>
}

function ValidationSummaryPanel({ summary }: { summary: Data["validationSummary"] }) {
  return (
    <div className={cn(cardClass, "px-4 py-3")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Synthèse validation
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-foreground">
        <span>
          <span className="text-muted-foreground">Décisions générées :</span>{" "}
          <span className="font-semibold tabular-nums">{summary.generated}</span>
        </span>
        <SummaryDot />
        <span>
          <span className="text-muted-foreground">Confirmées :</span>{" "}
          <span className="font-semibold tabular-nums">{summary.validated}</span>
        </span>
        <SummaryDot />
        <span>
          <span className="text-muted-foreground">Modifiées :</span>{" "}
          <span className="font-semibold tabular-nums">{summary.modified}</span>
        </span>
        <SummaryDot />
        <span>
          <span className="text-muted-foreground">En attente :</span>{" "}
          <span className="font-semibold tabular-nums">{summary.pending}</span>
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

function DecisionAnalysisPanel({ row }: { row: Row | null }) {
  if (!row) {
    return (
      <Card className={cn(cardClass, "h-full")}>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-sm font-medium text-foreground">Analyse décision</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground">
            Sélectionnez une recommandation pour afficher l&apos;analyse.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { analysis } = row

  return (
    <Card className={cn(cardClass, "h-full")}>
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="text-sm font-medium text-foreground">Analyse décision</CardTitle>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{row.careId}</p>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-3">
        <dl className="space-y-2.5">
          <AnalysisField label="Recommandation" value={analysis.recommendation} />
          <AnalysisField label="Motif" value={analysis.reason} />
          <AnalysisField
            label="Confiance IA"
            value={analysis.confidencePct != null ? `${analysis.confidencePct} %` : "—"}
          />
        </dl>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Signaux</p>
          <ul className="mt-1 space-y-0.5">
            {analysis.signals.map((signal) => (
              <li key={signal} className="text-xs text-foreground before:mr-1.5 before:text-muted-foreground before:content-['·']">
                {signal}
              </li>
            ))}
          </ul>
        </div>
        <dl className="space-y-2.5 border-t border-border/60 pt-2.5">
          <AnalysisField label="Action agent" value={row.agentActionLabel ?? "—"} />
          <AnalysisField label="Validation" value={row.validationLabel} />
          <AnalysisField label="Retour agent" value={analysis.agentFeedback} />
          <AnalysisField label="Commentaire" value={analysis.comment ?? "—"} />
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

function ValidationLabel({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "text-xs font-medium",
        label === "Modifiée" && "text-amber-700 dark:text-amber-500",
        label === "Confirmée" && "text-foreground",
        label === "En attente" && "text-muted-foreground",
      )}
    >
      {label}
    </span>
  )
}

const TABLE_ROW_LIMIT = 40

export function AdminRecommendationsView({ data }: { data: Data }) {
  const [decisionFilter, setDecisionFilter] = useState<AdminRecommendationDecisionFilter>("all")
  const [alignmentFilter, setAlignmentFilter] = useState<"all" | "aligned" | "overridden" | "pending">(
    "all",
  )
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { validationSummary, rows } = data

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (!matchesRecommendationDecisionFilter(row.orchestratedDecision, decisionFilter)) return false
      if (alignmentFilter !== "all" && row.alignmentStatus !== alignmentFilter) return false
      return true
    })
  }, [rows, decisionFilter, alignmentFilter])

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
      <ValidationSummaryPanel summary={validationSummary} />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-start">
        <Card className={cardClass}>
          <CardHeader className="space-y-3 border-b border-border/60 px-4 py-3">
            <CardTitle className="text-sm font-medium text-foreground">
              Historique des recommandations
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={decisionFilter}
                onValueChange={(v) => setDecisionFilter(v as AdminRecommendationDecisionFilter)}
              >
                <SelectTrigger size="sm" className="h-8 w-[11.5rem] border-border/60 text-xs shadow-none">
                  <SelectValue placeholder="Décision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les décisions</SelectItem>
                  <SelectItem value="resolve">Résolues</SelectItem>
                  <SelectItem value="escalate_n3">Escalade N3</SelectItem>
                  <SelectItem value="transfer">Transferts</SelectItem>
                  <SelectItem value="suspend">Suspendus</SelectItem>
                </SelectContent>
              </Select>
              <Select value={alignmentFilter} onValueChange={setAlignmentFilter}>
                <SelectTrigger size="sm" className="h-8 w-[10rem] border-border/60 text-xs shadow-none">
                  <SelectValue placeholder="Validation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes validations</SelectItem>
                  <SelectItem value="aligned">Confirmées</SelectItem>
                  <SelectItem value="overridden">Modifiées</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  {[
                    "CARE ID",
                    "Incident",
                    "Décision IA",
                    "Confiance",
                    "Signaux",
                    "KM",
                    "Action agent",
                    "Validation",
                  ].map((h) => (
                    <TableHead key={h} className="h-9 px-3 text-xs font-medium text-muted-foreground">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                      Aucune recommandation ne correspond aux filtres.
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
                        <TableCell className="max-w-[10rem] px-3 py-2.5 text-xs font-medium text-foreground">
                          {row.aiDecision}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                          {row.confidencePct != null ? `${row.confidencePct} %` : "—"}
                        </TableCell>
                        <TableCell className="max-w-[8rem] px-3 py-2.5 text-xs text-muted-foreground">
                          {row.signalSummary}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                          {row.aiKmCode ?? "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-xs text-foreground">
                          {row.agentActionLabel ?? "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <ValidationLabel label={row.validationLabel} />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            {truncated ? (
              <p className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
                Affichage limité aux {TABLE_ROW_LIMIT} premiers résultats ({filteredRows.length} au total). Affinez les
                filtres pour cibler un ticket.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <DecisionAnalysisPanel row={selectedRow} />
      </div>
    </div>
  )
}
