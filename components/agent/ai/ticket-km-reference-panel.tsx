"use client"

import Link from "next/link"
import { BookOpen, Route, ShieldAlert, Stethoscope } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buildAgentProcedureUrl, formatKmSelectionReason } from "@/lib/agent-procedure-link"
import { baseDecisionFromLabel } from "@/lib/ai/orchestration/orchestrated-ticket-decision"
import { formatKmConfidenceLevel } from "@/lib/ai/km-display"
import { formatOperationalConfidence } from "@/lib/ai/operational-ui"
import type { OperationalIntelligencePayload } from "@/lib/ai/orchestration/types"
import { cn } from "@/lib/utils"

type Props = {
  intelligence: OperationalIntelligencePayload
  kmSteps?: string | null
}

const KM_TYPE_META: Record<
  string,
  { label: string; icon: typeof BookOpen; accent: string }
> = {
  resolution: {
    label: "Procédure de résolution",
    icon: BookOpen,
    accent: "border-emerald-500/25 bg-emerald-500/[0.04]",
  },
  diagnostic: {
    label: "Référence diagnostic",
    icon: Stethoscope,
    accent: "border-amber-500/25 bg-amber-500/[0.04]",
  },
  routing: {
    label: "Référence de routage",
    icon: Route,
    accent: "border-primary/25 bg-primary/[0.04]",
  },
  validation: {
    label: "Contrôle de complétude",
    icon: ShieldAlert,
    accent: "border-amber-500/25 bg-amber-500/[0.04]",
  },
}

function parseKmSteps(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  } catch {
    /* plain text */
  }
  return raw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function KmCardShell({
  meta,
  trailing,
  children,
}: {
  meta: (typeof KM_TYPE_META)[string]
  trailing?: React.ReactNode
  children: React.ReactNode
}) {
  const Icon = meta.icon
  return (
    <div className={cn("overflow-hidden rounded-lg border shadow-sm", meta.accent)}>
      <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-background/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-foreground">
            {meta.label}
          </span>
        </div>
        {trailing}
      </div>
      <div className="space-y-3 bg-card/80 p-3">{children}</div>
    </div>
  )
}

export function TicketKmReferencePanel({ intelligence, kmSteps }: Props) {
  const km = intelligence.kmRecommendation.primary
  const hasValidatedKm = intelligence.kmRecommendation.available && Boolean(km?.kmId)
  const actionLabel =
    intelligence.recommendedAction.actionLabel ?? intelligence.orchestrated?.decisionLabel ?? null
  const decisionBase = baseDecisionFromLabel(actionLabel ?? "")
  const kmType = intelligence.orchestrated?.kmType ?? "resolution"
  const meta = KM_TYPE_META[kmType] ?? KM_TYPE_META.resolution
  const procedureSteps = parseKmSteps(kmSteps)

  if (hasValidatedKm && km && decisionBase !== "TRANSFER" && decisionBase !== "REQUEST_INFORMATION") {
    return (
      <KmCardShell
        meta={meta}
        trailing={
          km.similarityPct != null ? (
            <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px] tabular-nums">
              {formatOperationalConfidence(km.similarityPct)}
            </Badge>
          ) : null
        }
      >
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={buildAgentProcedureUrl(km.kmId)}
              className="font-mono text-[11px] font-semibold text-primary hover:underline"
            >
              {km.kmId}
            </Link>
          </div>
          <p className="text-xs font-medium leading-snug text-foreground">{km.title}</p>
          <p className="text-[10px] text-muted-foreground">
            Confiance {formatKmConfidenceLevel(km.confidenceLevel)}
          </p>
        </div>

        {km.whyThisKm ? (
          <div className="rounded-md border border-border/60 bg-muted/25 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sélection
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-foreground">
              {formatKmSelectionReason(km.whyThisKm, km.kmId)}
            </p>
          </div>
        ) : null}

        {decisionBase === "RESOLVE" ? (
          <>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Prérequis magasin
              </p>
              <ul className="mt-1.5 space-y-1">
                {[
                  "État de synchronisation et contexte magasin confirmés",
                  "Périphériques et identifiants de caisse vérifiés",
                  "Logs collectés avant remédiation",
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-[11px] text-foreground">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-600/70" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {procedureSteps.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Étapes procédure
                </p>
                <ol className="mt-1.5 space-y-1">
                  {procedureSteps.slice(0, 6).map((step, i) => (
                    <li key={i} className="flex gap-2 text-[11px] leading-snug text-foreground">
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </>
        ) : null}

        {decisionBase === "ESCALATE_N3" ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Référence à joindre au dossier N3 — ne remplace pas l&apos;escalade spécialiste.
          </p>
        ) : null}

        <div className="rounded-md border border-destructive/20 bg-destructive/[0.04] px-2.5 py-2">
          <p className="text-[10px] font-semibold text-destructive">Si échec</p>
          <p className="mt-0.5 text-[11px] leading-snug text-foreground">
            {decisionBase === "ESCALATE_N3"
              ? "Documenter les tentatives FO et transmettre le dossier complet à N3."
              : "Escalader N3 avec diagnostics — la procédure n'a pas rétabli le service."}
          </p>
        </div>
      </KmCardShell>
    )
  }

  if (decisionBase === "TRANSFER") {
    return (
      <KmCardShell meta={KM_TYPE_META.routing}>
        <p className="text-xs font-medium text-foreground">Aucune procédure KM validée</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          La résolution appartient à un autre périmètre. Aucune procédure KM FO validée ne s&apos;applique.
        </p>
      </KmCardShell>
    )
  }

  if (decisionBase === "REQUEST_INFORMATION") {
    return (
      <KmCardShell meta={KM_TYPE_META.validation}>
        <p className="text-xs font-medium text-foreground">Aucune procédure KM validée</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Compléter le contexte incident avant toute procédure KM.
        </p>
      </KmCardShell>
    )
  }

  return (
    <KmCardShell meta={KM_TYPE_META.resolution}>
      <p className="text-xs font-medium text-foreground">Aucune procédure KM validée</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Aucune procédure KM validée n&apos;a été identifiée pour ce ticket. Ne pas inventer de
        procédure — escalader, transférer ou suspendre selon l&apos;analyse décisionnelle.
      </p>
    </KmCardShell>
  )
}
