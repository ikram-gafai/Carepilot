import { InfoIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function EscalationTransferPage() {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Escalation &amp; Transfer Assistance</h1>
        <p className="text-xs text-muted-foreground">
          MVP : moteur de règles (pas de ML entraîné). Endpoint :{" "}
          <code className="rounded bg-muted px-1">POST /api/decision/assist</code>.
        </p>
      </div>
      <Alert>
        <InfoIcon />
        <AlertTitle className="text-xs">Portée MVP</AlertTitle>
        <AlertDescription className="text-xs">
          Les suggestions affichées sur les tickets proviennent de{" "}
          <code className="rounded bg-muted px-1">lib/rules/engine.ts</code> après analyse et retrieval — pas
          d’entraînement ML à ce stade.
        </AlertDescription>
      </Alert>
      <Card className="border-border bg-background shadow-none">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm">Principes opérationnels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 py-3 text-xs leading-relaxed text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>KM applicable mais non appliquée → éviter escalade N3 prématurée.</li>
            <li>KM appliquée + échec + historiques sensibles → signaler « échec de procédure ».</li>
            <li>Pas de KM / pas de résolution historique évidente → « absence de procédure ».</li>
            <li>Indices matériel/réseau après KM → revue transfert périmètre.</li>
            <li>Tickets similaires résolus N2 → décourager escalade prématurée.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
