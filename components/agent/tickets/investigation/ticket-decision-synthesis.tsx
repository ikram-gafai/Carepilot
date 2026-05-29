import { buildOperationalExplanation } from "@/lib/agent/operational-narrative"
import type { OperationalIntelligencePayload } from "@/lib/ai/orchestration/types"

import { InvestigationSection } from "./investigation-section"

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

function isDuplicateOfAny(text: string, references: string[]): boolean {
  const normalized = normalizeText(text)
  if (!normalized) return true
  return references.some((ref) => {
    const r = normalizeText(ref)
    if (!r) return false
    return normalized === r || normalized.includes(r) || r.includes(normalized)
  })
}

export function TicketDecisionSynthesis({
  intelligence,
}: {
  intelligence: OperationalIntelligencePayload
}) {
  const expl = buildOperationalExplanation(intelligence)
  if (!expl) return null

  const sidebarReason =
    intelligence.recommendedAction.reason ?? intelligence.orchestrated?.decisionReasoning ?? ""
  const sidebarRefs = [sidebarReason, expl.operationalAssessment]

  const rationale = expl.decisionRationale.filter((point) => !isDuplicateOfAny(point, sidebarRefs))
  const showValidation =
    expl.requiredValidation && !isDuplicateOfAny(expl.requiredValidation, sidebarRefs)
  const showHandling =
    expl.recommendedHandling && !isDuplicateOfAny(expl.recommendedHandling, [...sidebarRefs, ...rationale])

  if (rationale.length === 0 && !showValidation && !showHandling) return null

  return (
    <InvestigationSection title="Justification décisionnelle">
      <div className="space-y-3 rounded-lg border border-border/70 bg-muted/10 px-4 py-3">
        {rationale.length > 0 ? (
          <ul className="space-y-1.5">
            {rationale.map((point) => (
              <li key={point} className="flex gap-2.5 text-xs leading-relaxed text-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/80" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {showValidation ? (
          <div className="border-t border-border/50 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Validation requise
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground">{expl.requiredValidation}</p>
          </div>
        ) : null}

        {showHandling ? (
          <div className={rationale.length > 0 || showValidation ? "border-t border-border/50 pt-3" : ""}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Conduite agent
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground">{expl.recommendedHandling}</p>
          </div>
        ) : null}
      </div>
    </InvestigationSection>
  )
}
