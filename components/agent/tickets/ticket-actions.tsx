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
import { AGENT_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
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
    "Clôturer l'incident avec une note opérationnelle. À utiliser lorsque la cause racine est traitée et le magasin est stable.",
  request_information:
    "Demander au magasin les identifiants terminaux, messages d'erreur ou étapes de reproduction manquants avant de poursuivre le traitement FO.",
  suspend:
    "Mettre le traitement en pause en attendant le magasin ou un tiers. Le ticket reste visible avec un motif de mise en attente.",
  escalate_n3:
    "Escalader vers N3 lorsque les diagnostics sont épuisés sur le périmètre actuel. Même périmètre, niveau de support supérieur.",
  transfer_monetique: "Router vers Monétique lorsque l'incident est lié au paiement hors périmètre caisse.",
  transfer_materiel:
    "Router vers Matériel lorsque l'incident concerne un équipement (scanner, SCO, imprimante, câblage).",
  transfer_bo: "Router vers Back Office lorsque l'incident est hors périmètre caisse.",
  transfer_reseau: "Router vers Réseau pour un incident réseau magasin ou de connectivité.",
  transfer_bureautique: "Router vers Bureautique pour les outils bureau ou postes de travail.",
  transfer_infrastructure: "Router vers Infrastructure pour la plateforme ou le datacenter.",
}

function ActionDialog({
  ticketId,
  kind,
  displayLabel,
  trigger = "default",
  open: controlledOpen,
  onOpenChange,
}: {
  ticketId: number
  kind: OperationalActionKind
  displayLabel?: string
  trigger?: "default" | "bar" | "menu" | "none"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const label = displayLabel ?? OPERATIONAL_ACTION_LABELS[kind]
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
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
      toast.success("Mis à jour")
      setOpen(false)
      setNote("")
      router.refresh()
    })
  }

  const triggerNode =
    trigger === "menu" ? (
      <button type="button" className="w-full cursor-default px-2 py-1.5 text-left text-xs">
        {label}
      </button>
    ) : (
      <Button
        size="sm"
        variant="outline"
        className={
          trigger === "bar"
            ? "h-7 px-2.5 text-[11px] font-medium shadow-none"
            : "h-8 text-xs font-medium shadow-none"
        }
      >
        {label}
      </Button>
    )

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== "none" ? (
        trigger === "default" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>{triggerNode}</DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] border-zinc-200 text-xs leading-snug dark:border-zinc-700">
              {ACTION_HINTS[kind]}
            </TooltipContent>
          </Tooltip>
        ) : (
          <DialogTrigger asChild>{triggerNode}</DialogTrigger>
        )
      ) : null}
      <DialogContent className="border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-base">{OPERATIONAL_ACTION_LABELS[kind]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`note-${kind}`} className="text-xs text-zinc-600">
            Note opérationnelle
          </Label>
          <Textarea
            id={`note-${kind}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="resize-none text-sm"
            placeholder="Contexte, validation ou consignes pour le prochain responsable."
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" size="sm" variant="outline" className="border-zinc-300" disabled={pending} onClick={run}>
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return dialog
}

export const TicketActionDialog = ActionDialog

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
      <ActionGroup title="Résolution">
        {AGENT_RESOLUTION_ACTIONS.map((kind) => (
          <ActionDialog key={kind} ticketId={ticketId} kind={kind} />
        ))}
      </ActionGroup>
      <Separator className="bg-border" />
      <ActionGroup title="Escalade">
        {AGENT_ESCALATION_ACTIONS.map((kind) => (
          <ActionDialog key={kind} ticketId={ticketId} kind={kind} />
        ))}
      </ActionGroup>
      <Separator className="bg-border" />
      <ActionGroup title="Transferts">
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
        <CardTitle className="text-sm font-semibold tracking-tight">Actions opérationnelles</CardTitle>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {AGENT_SECTION_SUBTITLES.ticketActions}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">{body}</CardContent>
    </Card>
  )
}

export function AIFeedbackPanel({
  ticketId,
  embedded = false,
  compact = false,
  flat = false,
}: {
  ticketId: number
  embedded?: boolean
  compact?: boolean
  flat?: boolean
}) {
  const [helpful, setHelpful] = useState<string>("unset")
  const [rating, setRating] = useState<string>("")
  const [comment, setComment] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()

  // Reset the feedback form when another ticket is shown (adjusted during render).
  const [formTicketId, setFormTicketId] = useState(ticketId)
  if (formTicketId !== ticketId) {
    setFormTicketId(ticketId)
    setHelpful("unset")
    setRating("")
    setComment("")
  }

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
      toast.success("Retour enregistré")
      setHelpful("unset")
      setRating("")
      setComment("")
      router.refresh()
    })
  }

  const formBody = compact ? (
    <div className="grid gap-2 sm:grid-cols-[1fr_5rem_1fr_auto] sm:items-end">
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Utile ?</Label>
        <Select value={helpful} onValueChange={setHelpful}>
          <SelectTrigger className="h-7 text-[11px]">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unset">—</SelectItem>
            <SelectItem value="yes">Oui</SelectItem>
            <SelectItem value="no">Non</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Conf.</Label>
        <Select value={rating || "__none__"} onValueChange={(v) => setRating(v === "__none__" ? "" : v)}>
          <SelectTrigger className="h-7 text-[11px]">
            <SelectValue placeholder="—" />
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
      <div className="space-y-1">
        <Label htmlFor="fb-comment-compact" className="text-[10px] text-muted-foreground">
          Notes
        </Label>
        <Textarea
          id="fb-comment-compact"
          rows={1}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-7 resize-none text-[11px]"
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2.5 text-[11px]"
        disabled={pending}
        onClick={submit}
      >
        Envoyer
      </Button>
    </div>
  ) : (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-600 dark:text-zinc-400">Utile</Label>
        <Select value={helpful} onValueChange={setHelpful}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unset">Non renseigné</SelectItem>
            <SelectItem value="yes">Utile</SelectItem>
            <SelectItem value="no">Peu utile</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-600 dark:text-zinc-400">Note de confiance (1–5)</Label>
        <Select value={rating || "__none__"} onValueChange={(v) => setRating(v === "__none__" ? "" : v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Facultatif" />
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
        Envoyer la validation
      </Button>
    </>
  )

  if (embedded) {
    if (flat) return <div className="space-y-2">{formBody}</div>
    return <div className="space-y-3 rounded-lg border border-border/80 bg-background/60 p-3 dark:bg-zinc-950/30">{formBody}</div>
  }

  return (
    <Card className="border-zinc-200 shadow-sm dark:border-zinc-800">
      <CardHeader className="space-y-1 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <CardTitle className="text-sm font-semibold tracking-tight">Validation de la recommandation</CardTitle>
        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">{AGENT_SECTION_SUBTITLES.recommendationValidation}</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">{formBody}</CardContent>
    </Card>
  )
}
