"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"

export function RunKmAiButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setError(null)
    const res = await fetch("/api/ai/km/run", { method: "POST" })
    const data = (await res.json()) as { ok?: boolean; error?: string }
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Échec du lancement de l'IA KM")
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button disabled={pending} onClick={run} size="sm" type="button" variant="outline">
        {pending ? "Exécution de l'IA KM…" : "Lancer l'IA KM"}
      </Button>
      {error ? <span className="text-[10px] text-destructive">{error}</span> : null}
    </div>
  )
}
