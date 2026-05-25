import { CarePilotSetHeader } from "@/components/carepilot-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="space-y-3">
      <CarePilotSetHeader title="Settings" />
      <Card className="border-border bg-background shadow-none">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm">Local configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-3 text-xs text-muted-foreground">
          <p>
            Typical variables: <code className="rounded bg-muted px-1">DATABASE_URL</code>,{" "}
            <code className="rounded bg-muted px-1">CARE_SYNC_BATCH_LIMIT</code>,{" "}
            <code className="rounded bg-muted px-1">OPENAI_API_KEY</code> (optional for LLM summary).
          </p>
          <p>Do not commit secrets — use `.env.local`.</p>
        </CardContent>
      </Card>
    </div>
  )
}
