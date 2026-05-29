"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { TicketKmReferencePanel } from "@/components/agent/ai/ticket-km-reference-panel"
import { Button } from "@/components/ui/button"
import { baseDecisionFromLabel } from "@/lib/ai/orchestration/orchestrated-ticket-decision"
import { operationalSeverityLabel } from "@/lib/ai/operational-ui"
import type { OperationalIntelligencePayload, SignalSeverity } from "@/lib/ai/orchestration/types"
import { missingFieldLabel } from "@/lib/ai/missing-information"
import { cn } from "@/lib/utils"

type Props = {
  ticketId: number
  intelligence: OperationalIntelligencePayload
  kmSteps?: string | null
  canRunAi?: boolean
}

const CHECKLIST_KEYS = [
  "MISSING_TERMINAL_ID",
  "MISSING_ERROR_MESSAGE",
  "MISSING_SCREENSHOT_REFERENCE",
  "MISSING_REPRODUCTION_STEPS",
] as const

const DECISION_EMPHASIS: Record<string, string> = {
  REQUEST_INFORMATION: "text-amber-700 dark:text-amber-400",
  RESOLVE: "text-emerald-700 dark:text-emerald-400",
  ESCALATE_N3: "text-destructive",
  TRANSFER: "text-primary",
  SUSPEND: "text-muted-foreground",
}

function PanelBlock({
  title,
  trailing,
  children,
  emphasis,
}: {
  title: string
  trailing?: React.ReactNode
  children: React.ReactNode
  emphasis?: boolean
}) {
  return (
    <section className={cn("space-y-2", emphasis && "rounded-lg bg-primary/[0.04] px-2.5 py-2.5")}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {trailing}
      </div>
      {children}
    </section>
  )
}

function SignalRow({
  label,
  severity,
  confidencePct,
}: {
  label: string
  severity: SignalSeverity
  confidencePct: number | null
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-[11px]">
      <span className="font-medium text-foreground">{label}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {operationalSeverityLabel(severity)}
        {confidencePct != null ? ` · ${confidencePct}%` : ""}
      </span>
    </div>
  )
}

function buildSignalRows(intelligence: OperationalIntelligencePayload) {
  const rows: { label: string; severity: SignalSeverity; confidencePct: number | null }[] = []
  const labelMap: Record<string, string> = {
    sla: "Attention SLA",
    priority: "Signal priorité",
    escalation: "Signal escalade",
    transfer: "Signal transfert",
    missing_context: "Contexte manquant",
  }

  for (const signal of intelligence.operationalRisk.signals) {
    rows.push({
      label: labelMap[signal.key] ?? signal.label,
      severity: signal.severity,
      confidencePct: signal.confidencePct,
    })
  }

  return rows
}

export function TicketAiInvestigationPanel({
  intelligence,
  kmSteps,
  canRunAi = false,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { recommendedAction, ticketQuality } = intelligence

  const signalRows = buildSignalRows(intelligence)
  const missingSet = new Set(ticketQuality.missingFields.map(String))
  const actionLabel =
    recommendedAction.actionLabel ?? intelligence.orchestrated?.decisionLabel ?? null
  const decisionBase = baseDecisionFromLabel(actionLabel ?? "")
  const showRecommendedAction = Boolean(actionLabel)
  const incompletePct =
    ticketQuality.completenessPct != null ? 100 - ticketQuality.completenessPct : null

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PanelBlock title="Action suggérée" emphasis>
        {showRecommendedAction ? (
          <>
            <p
              className={cn(
                "text-xl font-semibold tracking-tight",
                (decisionBase && DECISION_EMPHASIS[decisionBase]) ?? "text-foreground",
              )}
            >
              {actionLabel}
            </p>
            {recommendedAction.confidencePct != null ? (
              <p className="text-[11px] text-muted-foreground">
                Confiance{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {recommendedAction.confidencePct}%
                </span>
              </p>
            ) : null}
            {(recommendedAction.reason ?? intelligence.orchestrated?.decisionReasoning) ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {recommendedAction.reason ?? intelligence.orchestrated?.decisionReasoning}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">Aide à la décision en attente d&apos;exécution du pipeline IA.</p>
        )}
      </PanelBlock>

      <PanelBlock title="Signaux opérationnels">
        {signalRows.length > 0 ? (
          <div className="divide-y divide-border/30 rounded-md bg-muted/20 px-2">
            {signalRows.map((row) => (
              <SignalRow key={row.label} {...row} />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Aucun signal élevé.</p>
        )}
      </PanelBlock>

      <PanelBlock
        title="Contexte manquant"
        trailing={
          incompletePct != null ? (
            <span className="font-mono text-[10px] font-semibold tabular-nums text-foreground">
              {incompletePct}% incomplet
            </span>
          ) : null
        }
      >
        <ul className="space-y-1 rounded-md bg-muted/20 px-2 py-1.5">
          {CHECKLIST_KEYS.map((key) => {
            const missing = missingSet.has(key)
            return (
              <li key={key} className="flex items-center gap-2 text-[11px]">
                <span
                  className={cn(
                    "inline-flex size-3 shrink-0 rounded-sm border",
                    missing ? "border-amber-500/60 bg-amber-500/15" : "border-emerald-500/50 bg-emerald-500/15",
                  )}
                  aria-hidden
                />
                <span className={missing ? "text-foreground" : "text-muted-foreground line-through decoration-border/80"}>
                  {missingFieldLabel(key).replace(/^Missing /i, "")}
                </span>
              </li>
            )
          })}
        </ul>
      </PanelBlock>

      <PanelBlock title="Référence KM">
        <TicketKmReferencePanel intelligence={intelligence} kmSteps={kmSteps} />
      </PanelBlock>

      {canRunAi ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-full text-[11px]"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
        >
          {pending ? "Actualisation…" : "Actualiser l'intelligence"}
        </Button>
      ) : null}
    </div>
  )
}
