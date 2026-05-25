"use client"

import * as React from "react"

import type { EnrichedRunbook } from "@/lib/agent-runbooks-catalog"
import { runbookCategorySet } from "@/lib/agent-runbooks-catalog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type SortKey = "usage" | "relevance"

function matchesSearch(r: EnrichedRunbook, q: string) {
  const t = q.trim().toLowerCase()
  if (!t) return true
  const blob = [r.code, r.title, r.category, r.contextLine, ...r.relatedKm].join(" ").toLowerCase()
  return blob.includes(t)
}

function severityLabel(s: EnrichedRunbook["severity"]) {
  if (s === "critical") return "P1-type"
  if (s === "elevated") return "Elevated"
  return "Standard"
}

function sortRunbooks(list: EnrichedRunbook[], sort: SortKey): EnrichedRunbook[] {
  const out = [...list]
  if (sort === "usage") {
    out.sort((a, b) => b.usageCount - a.usageCount || b.relevanceScore - a.relevanceScore || a.code.localeCompare(b.code))
  } else {
    out.sort((a, b) => b.relevanceScore - a.relevanceScore || b.usageCount - a.usageCount || a.code.localeCompare(b.code))
  }
  return out
}

function BulletSection({
  title,
  items,
  accent,
}: {
  title: string
  items: string[]
  accent: "default" | "escalate" | "transfer" | "evidence"
}) {
  if (items.length === 0 && accent === "transfer") {
    return (
      <div className="rounded-md border border-dashed border-primary/15 bg-muted/20 px-3 py-2 dark:bg-muted/10">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Not applicable — no default hardware transfer path for this pattern.</p>
      </div>
    )
  }
  const border =
    accent === "escalate"
      ? "border-l-[3px] border-l-primary/70"
      : accent === "transfer"
        ? "border-l-[3px] border-l-primary/45"
        : accent === "evidence"
          ? "border-l-[3px] border-l-primary/35"
          : "border-l-[3px] border-l-border"
  return (
    <div className={cn("rounded-md bg-muted/15 py-2.5 pl-3 pr-2 dark:bg-muted/10", border)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-foreground">
        {items.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/50" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RunbooksWorkspace({
  runbooks,
  className,
}: {
  runbooks: EnrichedRunbook[]
  className?: string
}) {
  const [q, setQ] = React.useState("")
  const [category, setCategory] = React.useState<string>("all")
  const [sort, setSort] = React.useState<SortKey>("usage")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const categories = React.useMemo(() => ["all", ...runbookCategorySet(runbooks)], [runbooks])

  const filtered = React.useMemo(() => {
    let list = runbooks.filter((r) => matchesSearch(r, q))
    if (category !== "all") list = list.filter((r) => r.category === category)
    return sortRunbooks(list, sort)
  }, [runbooks, q, category, sort])

  React.useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null)
      return
    }
    setSelectedId((prev) => {
      if (prev != null && filtered.some((r) => r.id === prev)) return prev
      return filtered[0]!.id
    })
  }, [filtered])

  const selected = selectedId != null ? runbooks.find((r) => r.id === selectedId) ?? null : null

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Search procedures"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Code, title, category, KM…"
            className="h-9 max-w-md border-border/90 bg-background text-sm shadow-sm ring-1 ring-primary/5 focus-visible:ring-primary/25"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sort</span>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger size="sm" className="h-8 w-[150px] border-border/90 text-xs shadow-sm ring-1 ring-primary/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usage">Usage frequency</SelectItem>
                <SelectItem value="relevance">Operational relevance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="w-full text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:w-auto sm:py-1.5">
          Categories
        </span>
        {categories.map((c) => {
          const active = category === c
          const label = c === "all" ? "All" : c
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "border-primary/35 bg-primary/[0.08] text-foreground shadow-sm ring-1 ring-primary/15"
                  : "border-border/80 bg-card text-muted-foreground hover:border-primary/20 hover:bg-primary/[0.04]",
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Card className="flex min-h-0 min-w-0 border-border/90 shadow-sm ring-1 ring-primary/8">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <ScrollArea className="min-h-0 flex-1">
              <ul className="p-1.5">
                {filtered.length === 0 ? (
                  <li className="px-3 py-8 text-center text-xs text-muted-foreground">No procedures match your filters.</li>
                ) : (
                  filtered.map((r) => {
                    const active = selected?.id === r.id
                    return (
                      <li key={r.id} className="px-0.5 pb-0.5">
                        <button
                          type="button"
                          onClick={() => setSelectedId(r.id)}
                          className={cn(
                            "flex w-full flex-col gap-0.5 rounded-md border border-transparent px-2.5 py-2 text-left transition-all",
                            active
                              ? "border-primary/25 bg-primary/[0.08] shadow-sm ring-1 ring-primary/12"
                              : "hover:border-border hover:bg-muted/40",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] font-medium text-primary">{r.code}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 border-primary/20 px-1.5 text-[9px] font-normal text-muted-foreground",
                                r.severity === "critical" && "border-destructive/30 text-destructive",
                              )}
                            >
                              {severityLabel(r.severity)}
                            </Badge>
                          </div>
                          <span className="text-xs font-semibold leading-snug text-foreground">{r.title}</span>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-normal">
                              {r.category}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{r.frequencyLabel} · use {r.usageCount}</span>
                          </div>
                          <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">{r.contextLine}</p>
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 min-w-0 border-border/90 shadow-md ring-1 ring-primary/10">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                Select a procedure for triage guidance.
              </div>
            ) : (
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-3 p-4">
                  <header className="rounded-lg border border-primary/12 bg-gradient-to-br from-primary/[0.06] to-transparent px-3 py-3 dark:from-primary/[0.08]">
                    <p className="font-mono text-[11px] font-medium text-primary">{selected.code}</p>
                    <h2 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">{selected.title}</h2>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{selected.contextLine}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      <span>
                        Usage · <span className="font-mono tabular-nums text-foreground">{selected.usageCount}</span>
                      </span>
                      <span className="text-border">|</span>
                      <span>
                        Relevance ·{" "}
                        <span className="font-mono tabular-nums text-foreground">
                          {(selected.relevanceScore * 100).toFixed(0)}%
                        </span>
                      </span>
                      {selected.lastUsedAt ? (
                        <>
                          <span className="text-border">|</span>
                          <span>
                            Last linked ·{" "}
                            {new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(
                              new Date(selected.lastUsedAt),
                            )}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </header>

                  <div className="rounded-md border-l-[3px] border-l-primary/40 bg-muted/15 py-2.5 pl-3 pr-2 dark:bg-muted/10">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Incident context</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-foreground">{selected.incidentContext}</p>
                  </div>

                  <BulletSection title="First checks" items={selected.firstChecks} accent="default" />

                  <div className="grid gap-2 sm:grid-cols-2">
                    <BulletSection title="Escalate when" items={selected.escalateWhen} accent="escalate" />
                    <BulletSection title="Transfer when (Hardware)" items={selected.transferMatWhen} accent="transfer" />
                  </div>

                  <BulletSection title="Required evidence" items={selected.requiredEvidence} accent="evidence" />

                  <div className="rounded-md border border-primary/15 bg-muted/20 px-3 py-2.5 dark:bg-muted/10">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Related KM codes</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Pointers to CARE — not full articles.</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selected.relatedKm.map((km) => (
                        <Badge
                          key={km}
                          variant="outline"
                          className="border-primary/25 font-mono text-[10px] font-normal text-foreground"
                        >
                          {km}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-border bg-card px-3 py-2.5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Operational notes</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-foreground">{selected.operationalNotes}</p>
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
