"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PENDING_AI_TRAINING } from "@/lib/ai-phase"
import {
  formatCompletenessScore,
  formatDetectionMethodLabel,
  formatMissingFieldWarnings,
  formatQualityLevel,
  MISSING_INFORMATION_SECTION_TITLE,
  qualityBadgeClass,
} from "@/lib/ai/missing-display"
import { AGENT_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
import type { MissingInformationRow } from "@/lib/ai/run-missing-information-analysis"
import { cn } from "@/lib/utils"

type Props = {
  ticketId: number
  analysis: MissingInformationRow | null
  canRunAnalysis?: boolean
}

export function MissingInformationPanel({ ticketId, analysis, canRunAnalysis = false }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function runAnalysis() {
    setError(null)
    const res = await fetch("/api/ai/missing-information/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketIds: [ticketId] }),
    })
    const data = (await res.json()) as { ok?: boolean; error?: string }
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Échec de l'analyse de complétude")
      return
    }
    startTransition(() => router.refresh())
  }

  if (!analysis) {
    return (
      <Card className="overflow-hidden border-border/90 shadow-sm">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="text-sm font-semibold tracking-tight">{MISSING_INFORMATION_SECTION_TITLE}</CardTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{AGENT_SECTION_SUBTITLES.missingAnalysisEmpty}</p>
        </CardHeader>
        <CardContent className="space-y-3 px-4 py-4 text-center">
          <p className="text-sm font-medium text-foreground">Analyse non exécutée</p>
          <p className="text-xs text-muted-foreground">
            Lancer l&apos;analyse pour identifier les informations manquantes.
          </p>
          {canRunAnalysis ? (
            <Button disabled={pending} onClick={runAnalysis} size="sm" type="button" variant="outline">
              {pending ? "Analyse…" : "Lancer l'analyse de complétude"}
            </Button>
          ) : (
            <p className="text-[11px] text-muted-foreground">{PENDING_AI_TRAINING}</p>
          )}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    )
  }

  const warnings = formatMissingFieldWarnings(analysis.missingFields)

  return (
    <Card className="overflow-hidden border-border/90 shadow-sm">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="text-sm font-semibold tracking-tight">{MISSING_INFORMATION_SECTION_TITLE}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Niveau de qualité</p>
            <p className={cn("mt-1 text-sm font-semibold", qualityBadgeClass(analysis.qualityLevel))}>
              {formatQualityLevel(analysis.qualityLevel)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Complétude</p>
            <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
              {formatCompletenessScore(analysis.completenessScore)}
            </p>
          </div>
        </div>

        <dl className="grid gap-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Confiance</dt>
            <dd className="font-mono font-medium tabular-nums">
              {formatCompletenessScore(analysis.confidenceScore)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Méthode</dt>
            <dd className="font-medium">{formatDetectionMethodLabel(analysis.detectionMethod)}</dd>
          </div>
        </dl>

        {warnings.length > 0 ? (
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Alertes opérationnelles
            </p>
            <ul className="mt-2 space-y-1">
              {warnings.slice(0, 6).map((warning) => (
                <li key={warning} className="text-xs text-foreground">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucun champ opérationnel manquant détecté.</p>
        )}

        {canRunAnalysis ? (
          <Button
            className="w-full"
            disabled={pending}
            onClick={runAnalysis}
            size="sm"
            type="button"
            variant="ghost"
          >
            {pending ? "Actualisation…" : "Relancer l'analyse de complétude"}
          </Button>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
