"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

export function RunEscalationAiButton({
  variant = "outline",
  size = "sm",
  className,
  label = "Lancer l'IA d'escalade",
}: {
  variant?: "outline" | "default" | "ghost"
  size?: "sm" | "default"
  className?: string
  label?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/ai/escalation/run", { method: "POST" })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Échec du lancement de l'IA d'escalade")
        return
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du lancement de l'IA d'escalade")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={pending}
        onClick={run}
      >
        <Sparkles className="size-3.5 opacity-80" aria-hidden />
        {pending ? "Exécution…" : label}
      </Button>
      {error ? <span className="max-w-[14rem] text-[10px] text-destructive">{error}</span> : null}
    </div>
  )
}
