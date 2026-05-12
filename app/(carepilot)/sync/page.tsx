import { CarePilotSetHeader } from "@/components/carepilot-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SyncConsole } from "@/components/sync-console"

export default function SyncPage() {
  return (
    <div className="space-y-3">
      <CarePilotSetHeader title="Synchronization" />
      <div>
        <p className="text-xs text-muted-foreground">
          Flux : CARE Simulator (<code className="rounded bg-muted px-1">care_source.*</code>) → CAREPILOT (
          <code className="rounded bg-muted px-1">carepilot.*</code>) puis pipeline IA modulaire.
        </p>
      </div>
      <Card className="border-border bg-background shadow-none">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm">Console de synchronisation</CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <SyncConsole />
        </CardContent>
      </Card>
    </div>
  )
}
