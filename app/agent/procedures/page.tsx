import type { Metadata } from "next"

import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { ProceduresPageShell } from "@/components/agent/runbooks/procedures-page-shell"
import { runbooksFromProcedures } from "@/lib/agent-runbooks-catalog"
import { fetchCarepilotPage } from "@/lib/carepilot-api/fetch-page"
import type { AgentProcedureRow } from "@/lib/agent-procedures-view"
import { getDbOrNull } from "@/lib/db"

export const metadata: Metadata = { title: "Procédures" }

export const dynamic = "force-dynamic"

export default async function AgentProceduresPage({
  searchParams,
}: {
  searchParams: Promise<{ km?: string }>
}) {
  const { km } = await searchParams
  const res = getDbOrNull()
    ? await fetchCarepilotPage<{ items: AgentProcedureRow[] }>("/api/agent/procedures")
    : { ok: false as const, error: "offline" }

  const procedures = res.ok ? res.data.items : []
  const runbooks = runbooksFromProcedures(procedures)

  const dbBanner = !res.ok ? (
    <div
      className="mb-2 shrink-0 rounded-lg border border-border/90 bg-muted/30 px-3 py-2.5 text-xs leading-snug text-muted-foreground"
      role="status"
    >
      Base de données hors ligne — les procédures se chargent lorsque DATABASE_URL est configurée.
    </div>
  ) : null

  return (
    <>
      {res.ok ? <CarepilotAutoRefresh intervalMs={60_000} /> : null}
      <ProceduresPageShell runbooks={runbooks} dbBanner={dbBanner} initialKm={km ?? null} />
    </>
  )
}
