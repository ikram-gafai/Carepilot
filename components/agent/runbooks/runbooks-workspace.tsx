"use client"

import * as React from "react"
import { Check, Clock, Search } from "lucide-react"

import type { EnrichedRunbook } from "@/lib/agent-runbooks-catalog"
import { findRunbookByKmCode } from "@/lib/agent-procedure-link"
import { KM_PROCEDURE_SECTIONS } from "@/lib/ai/decision-support-terminology"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

function matchesSearch(r: EnrichedRunbook, q: string) {
  const t = q.trim().toLowerCase()
  if (!t) return true
  const blob = [r.code, r.title, r.category, r.perimeter, r.contextLine].join(" ").toLowerCase()
  return blob.includes(t)
}

function ChecklistSection({
  title,
  items,
  variant,
}: {
  title: string
  items: string[]
  variant: "before" | "procedure" | "failure"
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {variant === "procedure" ? (
        <ol className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-foreground">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold tabular-nums text-primary">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
              <Check
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  variant === "failure" ? "text-destructive" : "text-primary",
                )}
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function RunbooksWorkspace({
  runbooks,
  className,
  initialKm,
}: {
  runbooks: EnrichedRunbook[]
  className?: string
  initialKm?: string | null
}) {
  const [q, setQ] = React.useState("")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const filtered = React.useMemo(
    () => runbooks.filter((r) => matchesSearch(r, q)),
    [runbooks, q],
  )

  // Selection sync, adjusted during render when its inputs change (previously two effects, same order):
  // 1) an initial KM code selects its runbook; 2) the selection is kept inside the filtered list.
  const [syncedInputs, setSyncedInputs] = React.useState<{
    initialKm: string | null | undefined
    runbooks: EnrichedRunbook[]
    filtered: EnrichedRunbook[]
  } | null>(null)
  if (
    syncedInputs === null ||
    syncedInputs.initialKm !== initialKm ||
    syncedInputs.runbooks !== runbooks ||
    syncedInputs.filtered !== filtered
  ) {
    let next = selectedId
    if (syncedInputs === null || syncedInputs.initialKm !== initialKm || syncedInputs.runbooks !== runbooks) {
      const match = initialKm?.trim() && runbooks.length > 0 ? findRunbookByKmCode(runbooks, initialKm) : null
      if (match) next = match.id
    }
    if (syncedInputs === null || syncedInputs.filtered !== filtered) {
      if (filtered.length === 0) next = null
      else if (next == null || !filtered.some((r) => r.id === next)) next = filtered[0]!.id
    }
    setSyncedInputs({ initialKm, runbooks, filtered })
    if (next !== selectedId) setSelectedId(next)
  }

  const selected = selectedId != null ? runbooks.find((r) => r.id === selectedId) ?? null : null

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Rechercher des procédures"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher code, titre, catégorie…"
          className="h-10 border-border/80 bg-background pl-9 text-sm shadow-sm"
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <ScrollArea className="min-h-0 flex-1">
            <ul className="divide-y divide-border/50 p-2">
              {filtered.length === 0 ? (
                <li className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Aucune procédure ne correspond à la recherche.
                </li>
              ) : (
                filtered.map((r) => {
                  const active = selected?.id === r.id
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className={cn(
                          "w-full rounded-lg px-3 py-3 text-left transition-colors",
                          active
                            ? "bg-primary/[0.08] ring-1 ring-primary/15"
                            : "hover:bg-muted/40",
                        )}
                      >
                        <p className="font-mono text-xs font-semibold text-primary">{r.code}</p>
                        <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{r.title}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Catégorie {r.category}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Utilisée {r.usageCount} tickets · Succès {r.successRatePct}%
                          {(r.escalatedAfterCount ?? 0) > 0
                            ? ` · Escalade ${r.escalatedAfterCount}`
                            : ""}
                        </p>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </ScrollArea>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground">
              Sélectionnez une procédure KM.
            </div>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-5">
                <header className="space-y-3 border-b border-border/50 pb-4">
                  <p className="font-mono text-sm font-semibold text-primary">{selected.code}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">{selected.title}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-normal">
                      {selected.category}
                    </Badge>
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      {selected.usageCount} tickets
                    </Badge>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                      Succès {selected.successRatePct}%
                    </Badge>
                    {(selected.escalatedAfterCount ?? 0) > 0 ? (
                      <Badge variant="outline" className="border-destructive/30 text-destructive">
                        Escalade {selected.escalatedAfterCount} tickets
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
                      <Clock className="size-3" aria-hidden />
                      {selected.estimatedMinutes} min
                    </Badge>
                  </div>
                </header>

                <ChecklistSection
                  title={KM_PROCEDURE_SECTIONS.beforeApplying}
                  items={selected.beforeApplying}
                  variant="before"
                />
                <ChecklistSection
                  title={KM_PROCEDURE_SECTIONS.procedure}
                  items={selected.procedureSteps}
                  variant="procedure"
                />
                <ChecklistSection
                  title={KM_PROCEDURE_SECTIONS.ifFailed}
                  items={selected.ifFailed}
                  variant="failure"
                />
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  )
}
