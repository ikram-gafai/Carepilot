"use client"

import * as React from "react"

/** Frontend-only operational cue — no backend sync. */
export function AgentDemoStatusBar() {
  const [syncMins, setSyncMins] = React.useState(2)

  React.useEffect(() => {
    const id = window.setInterval(
      () => setSyncMins((m) => (m >= 12 ? 1 : m + 1)),
      90_000,
    )
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="flex h-8 shrink-0 items-center justify-end gap-4 border-b border-primary/10 bg-zinc-50/90 px-4 text-[10px] text-zinc-600 backdrop-blur dark:bg-zinc-950/90 dark:text-zinc-400">
      <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
        <span
          className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px] shadow-primary/25"
          aria-hidden
        />
        Queue live
      </span>
      <span className="hidden tabular-nums sm:inline">Last sync {syncMins} min ago</span>
    </div>
  )
}
