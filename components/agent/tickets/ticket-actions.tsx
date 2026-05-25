"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { submitCpAgentAiFeedback, submitCpAgentTicketAction } from "@/app/agent/tickets/[id]/actions"
import {
  AGENT_ESCALATION_ACTIONS,
  AGENT_RESOLUTION_ACTIONS,
  AGENT_QUEUE_TRANSFER_ACTIONS,
  OPERATIONAL_ACTION_LABELS,
  type OperationalActionKind,
} from "@/lib/care-operational-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const ACTION_HINTS: Record<OperationalActionKind, string> = {
  resolve:
    "Close the incident with an operational note. Use when the root cause is addressed and the store is stable.",
  suspend:
    "Pause work while waiting on the store or a third party. The ticket stays visible with a hold reason.",
  escalate_n3:
    "Raise to N3 when diagnostics are exhausted on the current perimeter. Same perimeter, higher support level.",
  transfer_monetique: "Route to Payment when the issue is payment-related outside lane POS scope.",
  transfer_materiel:
    "Route to Hardware when the issue is device-related (scanner, SCO, printer, cabling).",
  transfer_bo: "Route to Back office when the issue is outside lane POS scope.",
  transfer_reseau: "Route to Network when the issue is store network or connectivity related.",
  transfer_bureautique: "Route to Workstation for office tooling or desktop issues.",
  transfer_infrastructure: "Route to Infrastructure for platform or datacenter scope.",
}

function ActionDialog({ ticketId, kind }: { ticketId: number; kind: OperationalActionKind }) {
  const label = OPERATIONAL_ACTION_LABELS[kind]
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()

  function run() {
    start(async () => {
      const res = await submitCpAgentTicketAction({ ticketId, kind, note: note.trim() || null })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Updated")
      setOpen(false)
      setNote("")
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 text-xs font-medium shadow-none">
              {label}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] border-zinc-200 text-xs leading-snug dark:border-zinc-700">
          {ACTION_HINTS[kind]}
        </TooltipContent>
      </Tooltip>
      <DialogContent className="border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-base">{label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`note-${kind}`} className="text-xs text-zinc-600">
            Operational note
          </Label>
          <Textarea
            id={`note-${kind}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="resize-none text-sm"
            placeholder="Context, validation, or next owner instructions."
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="outline" className="border-zinc-300" disabled={pending} onClick={run}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ActionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function TicketActions({
  ticketId,
  embedded = false,
  emphasis = false,
}: {
  ticketId: number
  embedded?: boolean
  emphasis?: boolean
}) {
  const body = (
    <>
      <ActionGroup title="Resolution">
        {AGENT_RESOLUTION_ACTIONS.map((kind) => (
          <ActionDialog key={kind} ticketId={ticketId} kind={kind} />
        ))}
      </ActionGroup>
      <Separator className="bg-border" />
      <ActionGroup title="Escalation">
        {AGENT_ESCALATION_ACTIONS.map((kind) => (
          <ActionDialog key={kind} ticketId={ticketId} kind={kind} />
        ))}
      </ActionGroup>
      <Separator className="bg-border" />
      <ActionGroup title="Transfers">
        {AGENT_QUEUE_TRANSFER_ACTIONS.map((kind) => (
          <ActionDialog key={kind} ticketId={ticketId} kind={kind} />
        ))}
      </ActionGroup>
    </>
  )

  if (embedded) {
    return (
      <div
        className={
          emphasis
            ? "rounded-xl border border-primary/25 bg-primary/[0.06] p-3.5 shadow-sm ring-1 ring-primary/15 dark:bg-primary/[0.08]"
            : "rounded-lg border border-border bg-muted/15 p-3 dark:bg-muted/10"
        }
      >
        {body}
      </div>
    )
  }

  return (
    <Card className="border-border shadow-sm ring-1 ring-border/40">
      <CardHeader className="space-y-1 border-b border-border pb-3">
        <CardTitle className="text-sm font-semibold tracking-tight">Operational actions</CardTitle>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Apply a controlled workflow transition with an audit note.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">{body}</CardContent>
    </Card>
  )
}

export function AIFeedbackPanel({ ticketId, embedded = false }: { ticketId: number; embedded?: boolean }) {
  const [helpful, setHelpful] = useState<string>("unset")
  const [rating, setRating] = useState<string>("")
  const [comment, setComment] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()

  function submit() {
    start(async () => {
      const res = await submitCpAgentAiFeedback({
        ticketId,
        helpful: helpful as "yes" | "no" | "unset",
        confidenceRating: rating ? Number(rating) : null,
        comment: comment.trim() || null,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Feedback recorded")
      setComment("")
      router.refresh()
    })
  }

  const formBody = (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-600 dark:text-zinc-400">Helpful</Label>
        <Select value={helpful} onValueChange={setHelpful}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unset">Not set</SelectItem>
            <SelectItem value="yes">Helpful</SelectItem>
            <SelectItem value="no">Not helpful</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-600 dark:text-zinc-400">Confidence rating (1–5)</Label>
        <Select value={rating || "__none__"} onValueChange={(v) => setRating(v === "__none__" ? "" : v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Optional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {["1", "2", "3", "4", "5"].map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fb-comment" className="text-xs text-zinc-600 dark:text-zinc-400">
          Note
        </Label>
        <Textarea id="fb-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="text-sm" />
      </div>
      <Button type="button" size="sm" variant="outline" className="w-full border-zinc-300 dark:border-zinc-600" disabled={pending} onClick={submit}>
        Submit validation
      </Button>
    </>
  )

  if (embedded) {
    return <div className="space-y-3 rounded-lg border border-border/80 bg-background/60 p-3 dark:bg-zinc-950/30">{formBody}</div>
  }

  return (
    <Card className="border-zinc-200 shadow-sm dark:border-zinc-800">
      <CardHeader className="space-y-1 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <CardTitle className="text-sm font-semibold tracking-tight">Recommendation validation</CardTitle>
        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">Supports the AI feedback loop for the PFE.</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">{formBody}</CardContent>
    </Card>
  )
}
