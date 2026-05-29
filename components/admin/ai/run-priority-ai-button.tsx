"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"

export function RunPriorityAiButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function runBatch() {
    setError(null)
    const res = await fetch("/api/ai/priority/run", { method: "POST" })
    const data = (await res.json()) as { ok?: boolean; error?: string }
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Échec du lancement de l'IA de priorité")
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button disabled={pending} onClick={runBatch} size="sm" type="button" variant="outline">
        {pending ? "Exécution de l'IA de priorité…" : "Lancer l'IA de priorité"}
      </Button>
      {error ? <span className="text-[10px] text-destructive">{error}</span> : null}
    </div>
  )
}
