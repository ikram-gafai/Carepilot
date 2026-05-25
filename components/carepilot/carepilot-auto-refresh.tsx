"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Lightweight RSC refresh aligned with the sync scheduler (default 60s).
 * Use on supervision pages only — avoids aggressive polling elsewhere.
 */
export function CarepilotAutoRefresh({
  intervalMs = 60_000,
  children,
}: {
  intervalMs?: number
  children?: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    if (intervalMs < 15_000) return
    const id = window.setInterval(() => router.refresh(), intervalMs)
    return () => window.clearInterval(id)
  }, [router, intervalMs])

  return children ?? null
}
