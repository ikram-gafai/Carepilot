"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LLM_EXPLANATION_ENABLED, PENDING_AI_TRAINING } from "@/lib/ai-phase"
import {
  formatExplanationModelLabel,
  formatLatencyMs,
  OPERATIONAL_EXPLANATION_SECTION_TITLE,
} from "@/lib/ai/llm-explanation-display"
import { AGENT_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
import type { OperationalExplanationRow } from "@/lib/ai/run-llm-explanations"

type Props = {
  ticketId: number
  explanation: OperationalExplanationRow | null
  canRunExplanation?: boolean
}

function ExplanationBlock({ label, text }: { label: string; text: string }) {
  if (!text.trim()) return null
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-foreground">{text}</p>
    </div>
  )
}

export function OperationalExplanationPanel({
  ticketId,
  explanation,
  canRunExplanation = false,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!LLM_EXPLANATION_ENABLED) {
    return null
  }

  async function runExplanation() {
    setError(null)
    const res = await fetch("/api/ai/explanations/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketIds: [ticketId] }),
    })
    const data = (await res.json()) as { ok?: boolean; error?: string }
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Échec de la génération de l'explication")
      return
    }
    startTransition(() => router.refresh())
  }

  if (!explanation) {
    return (
      <Card className="overflow-hidden border-border/90 shadow-sm">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="text-sm font-semibold tracking-tight">
            {OPERATIONAL_EXPLANATION_SECTION_TITLE}
          </CardTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{AGENT_SECTION_SUBTITLES.explanationEmpty}</p>
        </CardHeader>
        <CardContent className="space-y-3 px-4 py-4 text-center">
          <p className="text-sm font-medium text-foreground">Synthèse non générée</p>
          <p className="text-xs text-muted-foreground">
            Générer la synthèse à partir des signaux du ticket.
          </p>
          {canRunExplanation ? (
            <Button disabled={pending} onClick={runExplanation} size="sm" type="button" variant="outline">
              {pending ? "Génération…" : "Générer la synthèse"}
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
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold tracking-tight">
            {OPERATIONAL_EXPLANATION_SECTION_TITLE}
          </CardTitle>
          {canRunExplanation ? (
            <Button disabled={pending} onClick={runExplanation} size="sm" type="button" variant="ghost" className="h-7 px-2 text-xs">
              {pending ? "…" : "Actualiser"}
            </Button>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatExplanationModelLabel(explanation.modelName)} · {formatLatencyMs(explanation.latencyMs)} ·{" "}
          {explanation.updatedAt
            ? new Date(explanation.updatedAt).toLocaleString()
            : "—"}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-4">
        <ExplanationBlock label="Synthèse opérationnelle" text={explanation.operationalSummary} />
        <ExplanationBlock label="Décision suggérée" text={explanation.recommendedActionExplanation} />
        <ExplanationBlock label="Raisonnement" text={explanation.reasoning} />
        <ExplanationBlock label="Contexte manquant" text={explanation.missingInformationNote} />
        <ExplanationBlock label="Prochaines étapes" text={explanation.nextSteps} />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
