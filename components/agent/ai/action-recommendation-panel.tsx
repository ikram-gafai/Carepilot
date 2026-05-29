"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PENDING_AI_TRAINING } from "@/lib/ai-phase"
import {
  formatActionLabel,
  formatActionModelLabel,
  formatConfidencePct,
} from "@/lib/ai/action-display"
import type { ActionRecommendationRow } from "@/lib/ai/run-action-recommendations"
import { AGENT_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
import { cn } from "@/lib/utils"

type Props = {
  ticketId: number
  prediction: ActionRecommendationRow | null
  canRunPrediction?: boolean
}

export function ActionRecommendationPanel({
  ticketId,
  prediction,
  canRunPrediction = false,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function runPrediction() {
    setError(null)
    const res = await fetch("/api/ai/actions/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketIds: [ticketId] }),
    })
    const data = (await res.json()) as { ok?: boolean; error?: string }
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Échec de la prédiction IA")
      return
    }
    startTransition(() => router.refresh())
  }

  if (!prediction) {
    return (
      <Card className="overflow-hidden border-border/90 shadow-sm">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="text-sm font-semibold tracking-tight">Décision suggérée</CardTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{AGENT_SECTION_SUBTITLES.suggestedAction}</p>
        </CardHeader>
        <CardContent className="space-y-3 px-4 py-4 text-center">
          <p className="text-sm font-medium text-foreground">Analyse non exécutée</p>
          <p className="text-xs text-muted-foreground">
            Lancer l&apos;analyse pour obtenir la prochaine action.
          </p>
          {canRunPrediction ? (
            <Button disabled={pending} onClick={runPrediction} size="sm" type="button" variant="outline">
              {pending ? "Analyse…" : "Lancer l'analyse"}
            </Button>
          ) : (
            <p className="text-[11px] text-muted-foreground">{PENDING_AI_TRAINING}</p>
          )}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-border/90 shadow-sm">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="text-sm font-semibold tracking-tight">Décision suggérée</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Décision</p>
          <p className={cn("mt-1 text-sm font-semibold text-primary")}>
            {formatActionLabel(prediction.recommendedAction)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Motif</p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{prediction.reason}</p>
        </div>
        <dl className="grid gap-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Confiance</dt>
            <dd className="font-mono font-medium tabular-nums">
              {formatConfidencePct(prediction.confidenceScore)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Modèle</dt>
            <dd className="font-medium">{formatActionModelLabel(prediction.modelVersion)}</dd>
          </div>
        </dl>
        {canRunPrediction ? (
          <Button
            className="w-full"
            disabled={pending}
            onClick={runPrediction}
            size="sm"
            type="button"
            variant="ghost"
          >
            {pending ? "Actualisation…" : "Relancer la prédiction IA"}
          </Button>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
