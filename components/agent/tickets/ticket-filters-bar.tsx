"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  TICKET_QUEUE_QUICK_FILTERS,
  type TicketQueueQuickFilter,
} from "@/lib/agent/ticket-queue-display"
import { cn } from "@/lib/utils"

const FILTER_LABEL_FR: Record<TicketQueueQuickFilter, string> = {
  all: "Tous",
  p1: "P1",
  attention: "Attention",
  escalation: "Escalade",
  transfer: "Transfert",
  missing_context: "Contexte manquant",
}

function readFilters(sp: URLSearchParams) {
  const mine = sp.get("mine") === "1"
  const quick = (sp.get("filter") as TicketQueueQuickFilter) ?? "all"
  return {
    q: sp.get("q") ?? "",
    quick: TICKET_QUEUE_QUICK_FILTERS.some((f) => f.id === quick) ? quick : "all",
    mine,
  }
}

function toQueryString(f: ReturnType<typeof readFilters>) {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set("q", f.q.trim())
  if (f.quick !== "all") p.set("filter", f.quick)
  if (f.mine) p.set("mine", "1")
  return p.toString()
}

export function TicketFiltersBar() {
  const router = useRouter()
  const sp = useSearchParams()
  const [pending, start] = useTransition()

  const fromUrl = useMemo(() => readFilters(sp), [sp])
  const [q, setQ] = useState(fromUrl.q)

  useEffect(() => {
    setQ(fromUrl.q)
  }, [fromUrl.q])

  function navigate(next: Partial<ReturnType<typeof readFilters>>) {
    const merged = { ...fromUrl, ...next }
    const qs = toQueryString(merged)
    start(() => {
      router.push(qs ? `/agent/tickets?${qs}` : "/agent/tickets")
    })
  }

  function submitSearch() {
    navigate({ q })
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitSearch()
          }}
          placeholder="Rechercher CARE ID ou titre…"
          className="h-11 pl-9 text-sm"
          disabled={pending}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TICKET_QUEUE_QUICK_FILTERS.map((chip) => {
          const active = fromUrl.quick === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              disabled={pending}
              onClick={() => navigate({ quick: chip.id })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/80 bg-background text-muted-foreground hover:border-primary/25 hover:bg-primary/[0.04] hover:text-foreground",
              )}
            >
              {FILTER_LABEL_FR[chip.id]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
