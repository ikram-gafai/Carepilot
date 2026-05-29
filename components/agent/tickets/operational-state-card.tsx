import { agentTicketStatusLabel } from "@/components/agent/ui/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function slaTtrExposureLabel(label: string): string {
  const t = label.trim()
  if (t === "—" || t === "Not set") return t === "—" ? "Non applicable" : "Non renseigné"
  return t
}

export function OperationalStateCard({
  status,
  escalationRisk,
  slaTtrLabel,
  assigneeName,
  recommendedAction,
  requiredNextStep,
}: {
  status: string
  escalationRisk: string
  slaTtrLabel: string
  assigneeName: string | null
  /** One-line primary recommendation (English UI). */
  recommendedAction: string
  /** Short next step for scanning. */
  requiredNextStep: string
}) {
  const risk = escalationRisk.charAt(0).toUpperCase() + escalationRisk.slice(1).toLowerCase()

  const rows: { k: string; v: string }[] = [
    { k: "Statut", v: agentTicketStatusLabel(status) },
    { k: "Décision suggérée", v: recommendedAction },
    { k: "Signal N3", v: risk },
    { k: "Attention SLA", v: slaTtrExposureLabel(slaTtrLabel) },
    { k: "Prochaine étape", v: requiredNextStep },
    { k: "Responsable", v: assigneeName?.trim() || "Non assigné" },
  ]

  return (
    <Card className="border-border/80 bg-muted/15 shadow-none ring-1 ring-border/50 dark:bg-muted/10">
      <CardHeader className="space-y-0 pb-2 pt-3">
        <CardTitle className="text-xs font-medium text-muted-foreground">Statut</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 px-3 pb-3 pt-0 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.k} className="rounded-md border border-border/60 bg-background/60 px-2.5 py-2">
            <p className="text-[10px] font-medium text-muted-foreground">{row.k}</p>
            <p className="mt-0.5 text-xs font-semibold leading-snug text-foreground">{row.v}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
