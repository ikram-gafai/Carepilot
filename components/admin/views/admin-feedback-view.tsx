"use client"

import Link from "next/link"

import { AdminAlignmentBadge } from "@/components/admin/ui/admin-alignment-badge"
import type { adminFeedbackSupervision } from "@/lib/queries/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { adminSurfaces } from "@/lib/admin-surface"
import { ADMIN_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
import { cn } from "@/lib/utils"

type Data = Awaited<ReturnType<typeof adminFeedbackSupervision>>

const cardClass = cn(adminSurfaces.card, "shadow-sm")
const sectionTitle = "text-sm font-medium text-foreground"

const sectionSubtitle = "mt-0.5 text-[11px] text-muted-foreground"

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border/60 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

export function AdminFeedbackView({ data }: { data: Data }) {
  const { summary, diagnostics, feedbackRows, recommendationRows } = data

  const adjustmentRate =
    summary.actionsCompleted > 0
      ? Math.round((summary.adjustedDecisions / summary.actionsCompleted) * 100)
      : 0

  const feedbackRate =
    diagnostics.activeTickets > 0
      ? Math.round((diagnostics.withFeedback / diagnostics.activeTickets) * 100)
      : 0

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 pb-6">
      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryMetric label="Actions réalisées" value={summary.actionsCompleted} />
        <SummaryMetric label="Suggestions suivies" value={summary.followedAi} />
        <SummaryMetric label="Décisions ajustées" value={summary.adjustedDecisions} />
        <SummaryMetric label="Retours IA" value={summary.aiFeedbackSubmitted} />
        <SummaryMetric label="Taux ajustement" value={`${adjustmentRate} %`} />
      </section>

      <Card className={cardClass}>
        <CardHeader className="px-4 py-3">
          <CardTitle className={sectionTitle}>Diagnostics alignement</CardTitle>
          <p className={sectionSubtitle}>{ADMIN_SECTION_SUBTITLES.alignmentDiagnostics}</p>
        </CardHeader>
        <CardContent className="grid gap-1 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Tickets actifs", value: diagnostics.activeTickets },
            { label: "Actions agent", value: diagnostics.withAgentAction },
            { label: "Retours agent", value: diagnostics.withFeedback },
            { label: "Taux retours", value: `${feedbackRate} %` },
          ].map((row) => (
            <div key={row.label} className="flex justify-between gap-2 py-1 text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-mono tabular-nums">{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className="px-4 py-3">
          <CardTitle className={sectionTitle}>Retours agent</CardTitle>
          <p className={sectionSubtitle}>{ADMIN_SECTION_SUBTITLES.agentFeedback}</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                {[
                  "CARE ID",
                  "Décision suggérée",
                  "Action agent",
                  "Utile ?",
                  "Note",
                  "Commentaire",
                  "Alignement",
                ].map((h) => (
                  <TableHead key={h} className="h-9 px-3 text-xs font-medium text-muted-foreground">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbackRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                    Aucun retour agent enregistré pour le moment.
                  </TableCell>
                </TableRow>
              ) : (
                feedbackRows.map((row) => (
                  <TableRow key={row.ticketId} className="border-border/50">
                    <TableCell className="px-3 py-2.5">
                      <Link
                        href={`/agent/tickets/${row.ticketId}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {row.careId}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[10rem] px-3 py-2.5 text-xs">
                      {row.suggestedDecision}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-xs">{row.agentActionLabel ?? "—"}</TableCell>
                    <TableCell className="px-3 py-2.5 text-xs">{row.helpfulLabel}</TableCell>
                    <TableCell className="px-3 py-2.5 font-mono text-xs tabular-nums">
                      {row.confidenceRating ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[14rem] px-3 py-2.5 text-xs text-muted-foreground">
                      <span className="line-clamp-2">{row.comment ?? "—"}</span>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <AdminAlignmentBadge label={row.alignmentLabel} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className="px-4 py-3">
          <CardTitle className={sectionTitle}>Décisions récentes</CardTitle>
          <p className={sectionSubtitle}>{ADMIN_SECTION_SUBTITLES.recentDecisions}</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                {["CARE ID", "Décision suggérée", "Action agent", "Alignement"].map((h) => (
                  <TableHead key={h} className="h-9 px-3 text-xs font-medium text-muted-foreground">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {recommendationRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                    Aucune décision orchestrée sur la file active.
                  </TableCell>
                </TableRow>
              ) : (
                recommendationRows.map((row) => (
                  <TableRow key={row.ticketId} className="border-border/50">
                    <TableCell className="px-3 py-2.5">
                      <Link
                        href={`/agent/tickets/${row.ticketId}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {row.careId}
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-xs">{row.suggestedDecision}</TableCell>
                    <TableCell className="px-3 py-2.5 text-xs">{row.agentActionLabel ?? "—"}</TableCell>
                    <TableCell className="px-3 py-2.5">
                      <AdminAlignmentBadge label={row.alignmentLabel} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
