import Link from "next/link"
import { notFound } from "next/navigation"

import { ConfidenceBandBadge } from "@/components/confidence-band"
import { TicketAgentDecisionForm } from "@/components/ticket-agent-decision-form"
import { TicketEntitiesTable } from "@/components/ticket-detail/ticket-entities-table"
import { TicketPipelineBanner } from "@/components/ticket-detail/ticket-pipeline-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getDb } from "@/lib/db"
import { loadTicketDetail } from "@/lib/queries/ticket-detail"

type PageProps = { params: Promise<{ id: string }> }

export default async function TicketDetailPage(props: PageProps) {
  const { id } = await props.params
  const ticketId = Number.parseInt(id, 10)
  if (Number.isNaN(ticketId)) notFound()

  const db = getDb()
  const data = await loadTicketDetail(db, ticketId)
  if (!data || !data.source) notFound()

  const { ticket, source, analysis, similar, kmRecos, decisions, timeline } = data
  const aiDecision = decisions[0]

  const tags = (analysis?.operationalTags as string[] | undefined) ?? []
  const entities = (analysis?.extractedEntities ?? {}) as Record<string, unknown>
  const missingFields = (analysis?.missingFields as string[] | undefined) ?? []

  const hasAnalysis = Boolean(analysis)
  const hasSimilar = similar.length > 0
  const hasKmRecos = kmRecos.length > 0
  const hasDecision = Boolean(aiDecision)

  return (
    <div className="space-y-4">
      <TicketPipelineBanner
        hasAnalysis={hasAnalysis}
        hasSimilar={hasSimilar}
        hasKmRecos={hasKmRecos}
        hasDecision={hasDecision}
      />

      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Link href="/tickets" className="hover:text-foreground hover:underline">
              ← Tickets FO VLP
            </Link>
            <span className="text-border">/</span>
            <span className="font-mono">{source.careTicketId}</span>
            <span className="text-border">·</span>
            <span className="font-mono text-[10px]">CP#{ticket.id}</span>
          </div>
          <h1 className="text-lg font-semibold leading-snug tracking-tight">{source.title}</h1>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[10px] font-normal">
              {ticket.status}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-normal">
              {ticket.priority}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-normal">
              {ticket.perimeter}
            </Badge>
            {source.channel ? (
              <Badge variant="outline" className="text-[10px] font-normal">
                {source.channel}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tags opérationnels
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] font-normal">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <Card className="border-border bg-background shadow-none">
            <CardHeader className="border-b border-border py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm">Synthèse &amp; analyse</CardTitle>
                {typeof analysis?.confidenceScore === "number" ? (
                  <ConfidenceBandBadge score={analysis.confidenceScore} />
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 py-3 text-xs">
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">Résumé problème</div>
                <p className="mt-1 leading-relaxed">
                  {analysis?.aiSummary ?? (
                    <span className="text-muted-foreground">
                      Pas encore d’analyse — synchronisez et laissez le pipeline s’exécuter.
                    </span>
                  )}
                </p>
              </div>
              <Separator />
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">Entités extraites</div>
                <div className="mt-2">
                  {hasAnalysis ? (
                    <TicketEntitiesTable entities={entities} />
                  ) : (
                    <p className="text-[11px] text-muted-foreground">—</p>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">
                  Informations manquantes (à compléter terrain)
                </div>
                {missingFields.length ? (
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-[11px] leading-relaxed">
                    {missingFields.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Aucun champ critique signalé par l’heuristique MVP.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-background shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Tickets similaires (retrieval)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 py-3 text-xs">
              {similar.length === 0 ? (
                <div className="space-y-2 text-muted-foreground">
                  <p className="text-[11px]">Aucun résultat — le ticket n’a pas encore été vectorisé ou la sync est incomplète.</p>
                  <Button variant="link" size="xs" className="h-auto px-0 text-[11px]" asChild>
                    <Link href="/sync">Aller à la synchronisation</Link>
                  </Button>
                </div>
              ) : (
                similar.map((s) => (
                  <div key={`${s.similarId}-${s.rank}`} className="rounded border border-border bg-muted/20 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-[11px]">
                        <Link
                          className="text-primary underline-offset-2 hover:underline"
                          href={`/tickets/${s.similarId}`}
                        >
                          #{s.careRef}
                        </Link>
                        <span className="ml-2 text-[10px] text-muted-foreground">rang {s.rank}</span>
                      </div>
                      <ConfidenceBandBadge score={s.score} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{s.referenceNote}</p>
                    <div className="mt-2 border-t border-border/60 pt-2">
                      <div className="text-[11px] font-semibold text-muted-foreground">Pourquoi ?</div>
                      <ul className="mt-1 list-inside list-disc text-[11px] leading-relaxed text-muted-foreground">
                        <li>Proximité sémantique du ticket et alignement périmètre / symptômes.</li>
                        <li>Référence opérationnelle conservée pour audit.</li>
                      </ul>
                    </div>
                    <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                      Score interne : {s.score.toFixed(3)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-background shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Recommandations KM (catalogue existant)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 py-3 text-xs">
              {kmRecos.length === 0 ? (
                <div className="space-y-2 text-muted-foreground">
                  <p className="text-[11px]">Pas de reco — pipeline KM non exécuté ou corpus vide.</p>
                  <Button variant="link" size="xs" className="h-auto px-0 text-[11px]" asChild>
                    <Link href="/km">Voir les procédures KM</Link>
                  </Button>
                </div>
              ) : (
                kmRecos.map((k) => (
                  <div key={`${k.kmCode}-${k.rank}`} className="rounded border border-border bg-muted/10 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">
                        {k.kmCode}{" "}
                        <span className="font-normal text-muted-foreground">— {k.kmTitle}</span>
                      </div>
                      <ConfidenceBandBadge score={k.score} />
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed">{k.explanation}</p>
                    <div className="mt-2 border-t border-border/60 pt-2">
                      <div className="text-[11px] font-semibold text-muted-foreground">Pourquoi ?</div>
                      <ul className="mt-1 list-inside list-disc text-[11px]">
                        {(k.whyFactors ?? []).length ? (
                          (k.whyFactors ?? []).map((w) => <li key={w}>{w}</li>)
                        ) : (
                          <li className="text-muted-foreground">Similarité sémantique avec le ticket.</li>
                        )}
                      </ul>
                    </div>
                    <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                      Score interne : {k.score.toFixed(3)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-5">
          <Card className="border-border bg-background shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Escalade &amp; transfert — assistance IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 py-3 text-xs">
              {!aiDecision ? (
                <div className="space-y-2 text-muted-foreground">
                  <p className="text-[11px]">Pas encore de suggestion — exécutez la synchronisation / pipeline.</p>
                  <Button variant="link" size="xs" className="h-auto px-0 text-[11px]" asChild>
                    <Link href="/sync">Synchronisation</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold leading-snug">{aiDecision.suggestedAction}</div>
                    {typeof aiDecision.confidenceScore === "number" ? (
                      <ConfidenceBandBadge score={aiDecision.confidenceScore} />
                    ) : null}
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{aiDecision.reason}</p>
                  <div className="border-t border-border/60 pt-2">
                    <div className="text-[11px] font-semibold text-muted-foreground">Pourquoi ?</div>
                    <ul className="mt-1 list-inside list-disc text-[11px]">
                      {(aiDecision.whyFactors ?? []).map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                  {(aiDecision.blockingRules ?? []).length > 0 ? (
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        Garde-fous / blocages
                      </div>
                      <ul className="mt-1 list-inside list-disc text-[11px]">
                        {(aiDecision.blockingRules ?? []).map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-background shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Décision agent (manuelle)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 py-3 text-xs">
              <div className="rounded border border-dashed border-border bg-muted/20 p-2">
                <div className="text-[11px] font-semibold text-muted-foreground">Suggestion IA vs décision agent</div>
                <p className="mt-1 text-[11px]">
                  <span className="text-muted-foreground">Suggestion IA : </span>
                  <span className="font-medium">{aiDecision?.suggestedAction ?? "—"}</span>
                </p>
                <p className="mt-2 text-[11px]">
                  <span className="text-muted-foreground">Décision enregistrée : </span>
                  {ticket.agentFinalDecision ? (
                    <>
                      <span className="font-medium">{ticket.agentFinalDecision}</span>
                      {ticket.agentFinalDecisionAt ? (
                        <span className="ml-2 text-[10px] text-muted-foreground tabular-nums">
                          {new Date(ticket.agentFinalDecisionAt).toLocaleString("fr-FR")}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Aucune décision agent saisie.</span>
                  )}
                </p>
                {ticket.agentFinalDecisionNotes ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Notes : {ticket.agentFinalDecisionNotes}
                  </p>
                ) : null}
              </div>
              <TicketAgentDecisionForm
                ticketId={ticket.id}
                initialAiSuggestion={aiDecision?.suggestedAction ?? "—"}
              />
            </CardContent>
          </Card>

          <Card className="border-border bg-background shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Timeline opérationnelle</CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <ol className="relative space-y-0 border-l border-border pl-4 text-xs">
                {timeline.map((ev, idx) => (
                  <li key={`${ev.kind}-${idx}-${ev.occurredAt.toISOString()}`} className="relative pb-4 pl-1">
                    <div className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-muted-foreground/50 ring-2 ring-background" />
                    <div className="text-[10px] tabular-nums text-muted-foreground">
                      {new Date(ev.occurredAt).toLocaleString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                    <div className="font-medium leading-snug">{ev.title}</div>
                    {ev.subtitle ? (
                      <div className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                        {ev.subtitle}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
