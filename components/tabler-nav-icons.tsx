"use client"

import * as React from "react"

type IconCmp = React.ComponentType<{ className?: string }>

/** Outline when inactive, filled when nav is current (`aria-current="page"` on `SidebarMenuButton`). */
export function TablerSidebarNavIcons({
  Outline,
  Filled,
}: {
  Outline: IconCmp
  Filled: IconCmp
}) {
  return (
    <>
      <Outline className="size-4 shrink-0 opacity-80 group-aria-[current=page]/menu-button:hidden" />
      <Filled className="hidden size-4 shrink-0 group-aria-[current=page]/menu-button:block" />
    </>
  )
}

/** Outline when inactive, filled when Radix tab trigger has `data-state="active"`. */
export function TablerTabsTriggerIcons({
  Outline,
  Filled,
}: {
  Outline: IconCmp
  Filled: IconCmp
}) {
  return (
    <>
      <Outline className="size-4 shrink-0 group-data-[state=active]/tab-trigger:hidden" />
      <Filled className="hidden size-4 shrink-0 group-data-[state=active]/tab-trigger:block" />
    </>
  )
}
