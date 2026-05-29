import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { buildAgentProcedureUrl } from "@/lib/agent-procedure-link"
import { buildCareKmProcedureUrl } from "@/lib/care-km-external-link"
import type { InferSelectModel } from "drizzle-orm"

import { cpAgentKmSuggestions } from "@/lib/db/schema/cp-agent"

type Km = InferSelectModel<typeof cpAgentKmSuggestions>

export function KMSuggestionCard({
  item,
  contextBullets,
  compact = false,
  /** One-line match reason (compact mode). */
  shortMatch,
}: {
  item: Km
  contextBullets?: string[]
  /** When true: code, title, relevance, single primary action only. */
  compact?: boolean
  shortMatch?: string
}) {
  const score = Math.round(item.relevanceScore * 100)
  const careUrl = buildCareKmProcedureUrl(item.kmCode)
  const proceduresUrl = buildAgentProcedureUrl(item.kmCode)

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/15 bg-background/80 px-3 py-2.5 ring-1 ring-primary/8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-[11px] font-semibold text-primary">
              <Link href={proceduresUrl} className="hover:underline">
                {item.kmCode}
              </Link>
            </span>
            <span className="text-[10px] tabular-nums text-muted-foreground">{score}% pertinent</span>
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-foreground" title={item.title}>
            {item.title}
          </p>
          {shortMatch ? (
            <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-muted-foreground" title={shortMatch}>
              Correspondance · {shortMatch}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {careUrl ? (
            <Button variant="default" size="sm" className="h-8 px-3 text-xs font-medium shadow-sm" asChild>
              <a href={careUrl} target="_blank" rel="noopener noreferrer">
                Ouvrir dans CARE
              </a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium" asChild>
              <Link href={proceduresUrl}>Procédures</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="border-border bg-card shadow-sm ring-1 ring-primary/10">
      <CardContent className="space-y-2.5 p-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <span className="font-mono text-[11px] font-semibold tracking-tight text-foreground">
              <Link href={proceduresUrl} className="text-primary hover:underline">
                {item.kmCode}
              </Link>
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              Pertinence : <span className="font-medium text-foreground">{score}%</span>
            </span>
          </div>
          <p className="text-sm font-medium leading-snug text-foreground">{item.title}</p>
        </div>

        {contextBullets?.length ? (
          <div className="rounded-md border border-border/80 bg-muted/25 px-2 py-1.5 dark:bg-muted/15">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Suggéré car</p>
            <ul className="mt-1 space-y-0.5 text-[11px] leading-snug text-foreground">
              {contextBullets.map((line, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-muted-foreground" aria-hidden>
                    ·
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-0.5">
          {careUrl ? (
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-medium shadow-none" asChild>
              <a href={careUrl} target="_blank" rel="noopener noreferrer">
                Ouvrir dans CARE
              </a>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-medium shadow-none" asChild>
            <Link href={proceduresUrl}>Procédures opérationnelles</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
