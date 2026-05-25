"use client"

import * as React from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

export function TicketAgentDecisionForm({
  ticketId,
  initialAiSuggestion,
}: {
  ticketId: number
  initialAiSuggestion: string
}) {
  const [decision, setDecision] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("saving")
    try {
      const res = await fetch(`/api/tickets/${ticketId}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentFinalDecision: decision,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setStatus("saved")
    } catch {
      setStatus("error")
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-xs">
      <Separator />
      <div className="text-[11px] font-semibold text-muted-foreground">New entry</div>
      <div className="grid gap-2">
        <span className="font-medium text-muted-foreground">AI suggestion (reminder)</span>
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-2 py-2 leading-relaxed">
          {initialAiSuggestion}
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="agent-decision" className="text-xs font-medium">
          Final agent decision
        </Label>
        <Input
          id="agent-decision"
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          placeholder="e.g. Manual N3 escalation — network transfer cancelled"
          required
          className="h-9 text-xs"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="agent-notes" className="text-xs font-medium">
          Notes / audit (optional)
        </Label>
        <Textarea
          id="agent-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Field context, change reference, override justification…"
          rows={3}
          className="min-h-[4.5rem] resize-y text-xs"
        />
      </div>
      {status === "saved" ? (
        <Alert className="py-2">
          <AlertTitle className="text-xs">Decision saved</AlertTitle>
          <AlertDescription className="text-xs">
            Refresh the page to see the &quot;agent decision&quot; timeline entry.
          </AlertDescription>
        </Alert>
      ) : null}
      {status === "error" ? (
        <Alert variant="destructive" className="py-2">
          <AlertTitle className="text-xs">Save failed</AlertTitle>
          <AlertDescription className="text-xs">Check your network session and try again.</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button type="submit" size="sm" className="h-8 text-xs" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save decision"}
        </Button>
      </div>
    </form>
  )
}
