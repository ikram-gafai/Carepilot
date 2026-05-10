"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

export function SyncConsole() {
  const [log, setLog] = React.useState<string>("")
  const [loading, setLoading] = React.useState(false)

  async function runSync() {
    setLoading(true)
    setLog("")
    try {
      const res = await fetch("/api/sync/care", { method: "POST" })
      const json = await res.json()
      setLog(JSON.stringify(json, null, 2))
    } catch (e) {
      setLog(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" className="h-8 text-xs" disabled={loading} onClick={runSync}>
          {loading ? "Synchronisation…" : "Exécuter POST /api/sync/care"}
        </Button>
      </div>
      {log ? (
        <ScrollArea className="h-72 rounded-md border border-border">
          <pre className="p-3 font-mono text-[11px] leading-snug">{log}</pre>
        </ScrollArea>
      ) : (
        <p className="text-muted-foreground">
          Astuce : augmentez <code className="rounded bg-muted px-1">CARE_SYNC_BATCH_LIMIT</code> pour traiter plus de
          tickets par exécution (limite réseau / timeouts).
        </p>
      )}
    </div>
  )
}
