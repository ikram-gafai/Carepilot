import Link from "next/link"
import { AlertTriangleIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

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
  if (!hasAnalysis) bullets.push("Analyse IA / entités non calculées")
  if (!hasSimilar) bullets.push("Aucun ticket similaire indexé")
  if (!hasKmRecos) bullets.push("Pas de recommandations KM")
  if (!hasDecision) bullets.push("Pas de suggestion escalade & transfert")

  return (
    <Alert className="border-amber-600/35 bg-amber-50/95 shadow-none [&>svg]:text-amber-800">
      <AlertTriangleIcon />
      <AlertTitle className="text-xs font-semibold text-amber-950">Pipeline incomplet pour ce ticket</AlertTitle>
      <AlertDescription className="space-y-3 text-xs text-amber-950/90">
        <ul className="list-inside list-disc leading-relaxed">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[11px] leading-snug text-amber-950/75">
            Ré-enqueuez via <span className="text-foreground">POST /api/sync/care</span> jusqu’à traitement
            complet, ou relancez un POST analyze sur ce ticket.
          </p>
          <Button variant="outline" size="sm" className="h-8 shrink-0 text-xs" asChild>
            <Link href="/sync">Ouvrir synchronisation</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
