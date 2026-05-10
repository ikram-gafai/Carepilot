"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type IconCmp = React.ComponentType<{ className?: string }>

/** Outline when inactive, filled when `SidebarMenuButton` is active (`data-active` / `aria-current="page"`). */
export function TablerSidebarNavIcons({
  Outline,
  Filled,
}: {
  Outline: IconCmp
  Filled: IconCmp
}) {
  return (
    <>
      <Outline className="size-4 shrink-0 opacity-80 group-data-[active=true]/menu-button:hidden group-aria-[current=page]/menu-button:hidden" />
      <Filled className="hidden size-4 shrink-0 text-primary group-data-[active=true]/menu-button:block group-aria-[current=page]/menu-button:block" />
    </>
  )
}

/** Outline when inactive, filled when the tab is active (`data-active` on {@link TabsTab}). */
export function TablerTabsTriggerIcons({
  Outline,
  Filled,
}: {
  Outline: IconCmp
  Filled: IconCmp
}) {
  const [bounce, setBounce] = React.useState(false)
  const bounceEndRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(
    () => () => {
      if (bounceEndRef.current) clearTimeout(bounceEndRef.current)
    },
    [],
  )

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        bounce && "animate-[tab-icon-bounce_0.45s_ease-out]",
      )}
      onPointerDown={() => {
        if (
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          return
        }
        if (bounceEndRef.current) clearTimeout(bounceEndRef.current)
        setBounce(false)
        queueMicrotask(() => {
          setBounce(true)
          bounceEndRef.current = setTimeout(() => {
            setBounce(false)
            bounceEndRef.current = null
          }, 460)
        })
      }}
    >
      <Outline className="size-4 shrink-0 opacity-80 group-data-[active]/nav-tab:hidden" />
      <Filled className="hidden size-4 shrink-0 text-primary group-data-[active]/nav-tab:block" />
    </span>
  )
}
