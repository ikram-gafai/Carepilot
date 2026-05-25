import { AlertTriangleIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Props = {
  hasAnalysis: boolean
  hasSimilar: boolean
  hasKmRecos: boolean
  hasDecision: boolean
}

export function TicketPipelineBanner({ hasAnalysis, hasSimilar, hasKmRecos, hasDecision }: Props) {
  const missingPipeline = !hasAnalysis || !hasSimilar || !hasKmRecos || !hasDecision

  if (!missingPipeline) return null

  const bullets: string[] = []
  if (!hasAnalysis) bullets.push("AI analysis / entities not computed")
  if (!hasSimilar) bullets.push("No similar tickets indexed")
  if (!hasKmRecos) bullets.push("No KM recommendations")
  if (!hasDecision) bullets.push("No escalation & transfer suggestion")

  return (
    <Alert className="border-border bg-muted/35 shadow-none [&>svg]:text-muted-foreground">
      <AlertTriangleIcon />
      <AlertTitle className="text-xs font-semibold text-foreground">Incomplete pipeline for this ticket</AlertTitle>
      <AlertDescription className="space-y-3 text-xs text-muted-foreground">
        <ul className="list-inside list-disc leading-relaxed">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className="max-w-xl text-[11px] leading-snug text-muted-foreground">
          Operational data is synchronized from CARE in the background. AI pipeline steps are not active in this phase.
        </p>
      </AlertDescription>
    </Alert>
  )
}
