"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Opt = {
  statuses: string[]
  priorities: string[]
  categories: string[]
  agents: { id: number; name: string }[]
}

function readFilters(sp: URLSearchParams) {
  const mine = sp.get("mine") === "1"
  return {
    q: sp.get("q") ?? "",
    status: sp.get("status") ?? "all",
    priority: sp.get("priority") ?? "all",
    category: sp.get("category") ?? "all",
    assignedUserId: mine ? "mine" : (sp.get("assigned") ?? "all"),
    slaState: (sp.get("sla") as "all" | "at_risk" | "breached" | "ok") ?? "all",
    mine,
  }
}

function toQueryString(f: ReturnType<typeof readFilters>) {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set("q", f.q.trim())
  if (f.status !== "all") p.set("status", f.status)
  if (f.priority !== "all") p.set("priority", f.priority)
  if (f.category !== "all") p.set("category", f.category)
  if (f.mine) p.set("mine", "1")
  else if (f.assignedUserId !== "all") p.set("assigned", f.assignedUserId)
  if (f.slaState !== "all") p.set("sla", f.slaState)
  return p.toString()
}

export function TicketFiltersBar({ options }: { options: Opt }) {
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

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label className="text-xs text-zinc-600">Search</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="CARE ID, title, store…" className="h-9" />
        </div>
        <Button type="button" variant="secondary" className="h-9 shrink-0" disabled={pending} onClick={() => navigate({ q })}>
          Search
        </Button>
      </div>
      <div className="grid gap-2 sm:min-w-[140px]">
        <Label className="text-xs text-zinc-600">Status</Label>
        <Select value={fromUrl.status} onValueChange={(v) => navigate({ status: v })}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {options.statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 sm:min-w-[120px]">
        <Label className="text-xs text-zinc-600">Priority</Label>
        <Select value={fromUrl.priority} onValueChange={(v) => navigate({ priority: v })}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {options.priorities.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 sm:min-w-[140px]">
        <Label className="text-xs text-zinc-600">Category</Label>
        <Select value={fromUrl.category} onValueChange={(v) => navigate({ category: v })}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {options.categories.map((s) => (
              <SelectItem key={s} value={s}>
                {cpAgentCategoryLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 sm:min-w-[160px]">
        <Label className="text-xs text-zinc-600">Assigned agent</Label>
        <Select
          value={fromUrl.mine ? "mine" : fromUrl.assignedUserId}
          onValueChange={(v) =>
            v === "mine"
              ? navigate({ mine: true, assignedUserId: "all" })
              : navigate({ mine: false, assignedUserId: v })
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            <SelectItem value="mine">My queue</SelectItem>
            {options.agents.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 sm:min-w-[150px]">
        <Label className="text-xs text-zinc-600">SLA / TTR</Label>
        <Select value={fromUrl.slaState} onValueChange={(v) => navigate({ slaState: v as typeof fromUrl.slaState })}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="at_risk">At risk</SelectItem>
            <SelectItem value="breached">Breached</SelectItem>
            <SelectItem value="ok">On track / closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="button" variant="ghost" size="sm" className="h-9" disabled={pending} onClick={() => router.push("/agent/tickets")}>
        Reset
      </Button>
    </div>
  )
}
