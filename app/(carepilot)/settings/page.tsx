import { CarePilotSetHeader } from "@/components/carepilot-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="space-y-3">
      <CarePilotSetHeader title="Settings" />
      <Card className="border-border bg-background shadow-none">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm">Configuration locale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-3 text-xs text-muted-foreground">
          <p>
            Variables typiques : <code className="rounded bg-muted px-1">DATABASE_URL</code>,{" "}
            <code className="rounded bg-muted px-1">CARE_SYNC_BATCH_LIMIT</code>,{" "}
            <code className="rounded bg-muted px-1">OPENAI_API_KEY</code> (optionnel pour résumé LLM).
          </p>
          <p>Ne commitez pas de secrets — utilisez `.env.local`.</p>
        </CardContent>
      </Card>
    </div>
  )
}
