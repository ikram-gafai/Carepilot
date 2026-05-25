import { PENDING_AI_TRAINING } from "@/lib/ai-phase"
import { Card, CardContent } from "@/components/ui/card"
import type { CpAgentTicketRow } from "@/lib/queries/cp-agent"

/** AI recommendations disabled until training phase — operational ticket data only. */
export function OperationalIntelligencePanel({
  ticket: _ticket,
}: {
  ticket: CpAgentTicketRow
  assigneeName?: string | null
  analysis?: unknown
  relatedIncidents?: unknown[]
  km?: unknown[]
}) {
  return (
    <Card className="overflow-hidden border-border/90 shadow-sm">
      <CardContent className="flex min-h-[12rem] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-foreground">{PENDING_AI_TRAINING}</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Recommendations, transfers, escalations, and procedure suggestions will appear here after the AI
          training phase. Ticket data below is synchronized from CARE.
        </p>
      </CardContent>
    </Card>
  )
}
