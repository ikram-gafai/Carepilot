"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { OperationalWorkflowSection } from "@/components/agent/ai/operational-workflow-section"
import { Button } from "@/components/ui/button"
import { formatExplanationModelLabel, formatLatencyMs } from "@/lib/ai/llm-explanation-display"
import {
  formatOperationalConfidence,
  formatOperationalConfidenceLabel,
  OPERATIONAL_SECTIONS,
  operationalKmConfidenceClass,
  operationalQualityClass,
  operationalSeverityDotClass,
  operationalSeverityLabel,
  operationalSeverityTextClass,
} from "@/lib/ai/operational-ui"
import { AGENT_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
import type { OperationalIntelligencePayload, SignalSeverity } from "@/lib/ai/orchestration/types"
import { PENDING_AI_TRAINING } from "@/lib/ai-phase"
import { cn } from "@/lib/utils"

type Props = {
  ticketId: number
  intelligence: OperationalIntelligencePayload
  canRunAi?: boolean
}

function SeverityIndicator({ severity }: { severity: SignalSeverity }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide">
      <span className={cn("size-1.5 rounded-full", operationalSeverityDotClass(severity))} aria-hidden />
      <span className={operationalSeverityTextClass(severity)}>{operationalSeverityLabel(severity)}</span>
    </span>
  )
}

function EmptyBlock({ message }: { message: string }) {
  return <p className="text-[11px] leading-snug text-muted-foreground">{message}</p>
}

function defaultRiskOpen(risk: OperationalIntelligencePayload["operationalRisk"]): boolean {
  if (!risk.available) return false
  return risk.overallLevel === "high" || risk.overallLevel === "medium"
}

function defaultQualityOpen(quality: OperationalIntelligencePayload["ticketQuality"]): boolean {
  if (!quality.available) return false
  return quality.qualityLevel !== "COMPLETE" && quality.qualityLevel !== "ADEQUATE"
}

export function OperationalIntelligenceWorkflowPanel({ intelligence, canRunAi = false }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { ticketQuality, operationalRisk, recommendedAction, kmRecommendation, operationalExplanation } =
    intelligence

  async function refreshIntelligence() {
    setError(null)
    startTransition(() => router.refresh())
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
      <header className="border-b border-border/60 bg-muted/15 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Aide à la décision
        </p>
        <p className="mt-0.5 text-[11px] text-foreground">
          {AGENT_SECTION_SUBTITLES.decisionSupport} · {intelligence.meta.modulesAvailable}/{intelligence.meta.modulesTotal}
        </p>
      </header>

      {recommendedAction.available && recommendedAction.actionLabel ? (
        <div className="sticky top-0 z-10 border-b border-primary/20 bg-card/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/90">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Décision suggérée
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug text-primary">{recommendedAction.actionLabel}</p>
        </div>
      ) : null}

      <OperationalWorkflowSection
        step="01"
        title={OPERATIONAL_SECTIONS.quality}
        subtitle={AGENT_SECTION_SUBTITLES.contextQuality}
        collapsible
        defaultOpen={defaultQualityOpen(ticketQuality)}
      >
        {ticketQuality.available ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Niveau de qualité</p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    operationalQualityClass(ticketQuality.qualityLevel),
                  )}
                >
                  {ticketQuality.qualityLabel}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Complétude</p>
                <p className="font-mono text-sm font-semibold tabular-nums">{ticketQuality.completenessPct}%</p>
              </div>
            </div>
            {ticketQuality.vagueDescription ? (
              <p className="border-l-2 border-amber-500/50 pl-2 text-[11px] leading-snug text-amber-800 dark:text-amber-300">
                Description vague — demander une formulation d&apos;incident plus claire avant escalade.
              </p>
            ) : null}
            {ticketQuality.missingIdentifiers ? (
              <p className="border-l-2 border-border pl-2 text-[11px] leading-snug text-foreground">
                Identifiants magasin, lane ou terminal manquants détectés.
              </p>
            ) : null}
            {ticketQuality.warnings.length > 0 ? (
              <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                {ticketQuality.warnings.slice(0, 5).map((w) => (
                  <li key={w}>· {w}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-muted-foreground">Aucun champ opérationnel manquant signalé.</p>
            )}
          </div>
        ) : (
          <EmptyBlock message="Analyse de complétude non exécutée pour ce ticket." />
        )}
      </OperationalWorkflowSection>

      <OperationalWorkflowSection
        step="02"
        title={OPERATIONAL_SECTIONS.risk}
        subtitle={operationalRisk.available ? operationalRisk.headline : AGENT_SECTION_SUBTITLES.operationalSignals}
        collapsible
        defaultOpen={defaultRiskOpen(operationalRisk)}
        trailing={
          operationalRisk.available ? (
            <SeverityIndicator severity={operationalRisk.overallLevel} />
          ) : null
        }
      >
        {operationalRisk.available ? (
          <ul className="space-y-2">
            {operationalRisk.signals.map((signal) => (
              <li key={signal.key} className="flex items-start gap-2">
                <span
                  className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", operationalSeverityDotClass(signal.severity))}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{signal.label}</span>
                    {signal.confidencePct != null ? (
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                        {formatOperationalConfidence(signal.confidencePct)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{signal.value}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyBlock message="Exécuter le pipeline d&apos;analyse pour alimenter les signaux N3, routage, SLA et priorité." />
        )}
      </OperationalWorkflowSection>

      <OperationalWorkflowSection
        step="03"
        title={OPERATIONAL_SECTIONS.action}
        subtitle={AGENT_SECTION_SUBTITLES.suggestedAction}
        emphasized
      >
        {recommendedAction.available ? (
          <div className="space-y-1.5">
            <p className="text-base font-semibold leading-snug text-primary">{recommendedAction.actionLabel}</p>
            {recommendedAction.reason ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{recommendedAction.reason}</p>
            ) : null}
            {recommendedAction.confidencePct != null ? (
              <p className="text-[11px] text-muted-foreground">
                {formatOperationalConfidenceLabel(recommendedAction.confidencePct)}
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyBlock message="Aucune action suggérée disponible." />
        )}
      </OperationalWorkflowSection>

      <OperationalWorkflowSection
        step="04"
        title={OPERATIONAL_SECTIONS.km}
        subtitle={AGENT_SECTION_SUBTITLES.kmReference}
        collapsible
        defaultOpen={Boolean(kmRecommendation.primary)}
      >
        {kmRecommendation.available && kmRecommendation.primary ? (
          <div className="space-y-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {kmRecommendation.primary.kmId}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">
                {kmRecommendation.primary.title}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span
                className={cn(
                  "font-semibold uppercase",
                  operationalKmConfidenceClass(kmRecommendation.primary.confidenceLevel),
                )}
              >
                {kmRecommendation.primary.confidenceLevel}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {formatOperationalConfidence(kmRecommendation.primary.similarityPct)} correspondance
              </span>
            </div>
            {kmRecommendation.primary.whyThisKm ? (
              <p className="text-[11px] leading-snug text-muted-foreground">
                <span className="font-medium text-foreground">Pourquoi ce KM : </span>
                {kmRecommendation.primary.whyThisKm}
              </p>
            ) : null}
            {kmRecommendation.alternatives.length > 0 ? (
              <ul className="space-y-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                {kmRecommendation.alternatives.map((alt) => (
                  <li key={alt.kmId}>
                    {alt.title} · {formatOperationalConfidence(alt.similarityPct)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <EmptyBlock message="Aucune procédure KM correspondante pour cet incident." />
        )}
      </OperationalWorkflowSection>

      <OperationalWorkflowSection
        step="05"
        title={OPERATIONAL_SECTIONS.explanation}
        subtitle={AGENT_SECTION_SUBTITLES.operationalSummary}
      >
        {operationalExplanation.available ? (
          <div className="space-y-2.5 text-xs leading-relaxed">
            {operationalExplanation.operationalSummary ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Synthèse</p>
                <p className="mt-0.5 text-sm text-foreground">{operationalExplanation.operationalSummary}</p>
              </div>
            ) : null}
            {operationalExplanation.reasoning ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Raisonnement</p>
                <p className="mt-0.5 text-muted-foreground">{operationalExplanation.reasoning}</p>
              </div>
            ) : null}
            {operationalExplanation.missingInformationNote ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contexte manquant</p>
                <p className="mt-0.5 text-muted-foreground">{operationalExplanation.missingInformationNote}</p>
              </div>
            ) : null}
            {operationalExplanation.nextSteps ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prochaines étapes</p>
                <p className="mt-0.5 font-medium text-foreground">{operationalExplanation.nextSteps}</p>
              </div>
            ) : null}
            <p className="text-[10px] text-muted-foreground">
              {formatExplanationModelLabel(operationalExplanation.modelName ?? "")}
              {operationalExplanation.latencyMs != null ? ` · ${formatLatencyMs(operationalExplanation.latencyMs)}` : ""}
            </p>
          </div>
        ) : (
          <EmptyBlock message="Générer une explication LLM locale pour obtenir le support narratif opérationnel." />
        )}
      </OperationalWorkflowSection>

      <footer className="border-t border-border/60 px-3 py-2">
        {canRunAi ? (
          <div className="flex flex-col gap-1">
            <Button
              disabled={pending}
              onClick={refreshIntelligence}
              size="sm"
              type="button"
              variant="ghost"
              className="h-8 w-full text-xs"
            >
              {pending ? "Actualisation…" : "Actualiser l'analyse"}
            </Button>
            {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
          </div>
        ) : (
          <p className="text-center text-[10px] text-muted-foreground">{PENDING_AI_TRAINING}</p>
        )}
      </footer>
    </div>
  )
}
