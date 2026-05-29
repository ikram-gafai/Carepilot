"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Lightweight RSC refresh for supervision pages (default 2 min).
 */
export function CarepilotAutoRefresh({
  intervalMs = 120_000,
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
