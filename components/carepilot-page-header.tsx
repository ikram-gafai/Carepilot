"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { getCarePilotFallbackTitle } from "@/lib/carepilot-route-titles"
import { SidebarTrigger } from "@/components/ui/sidebar"

type HeaderState = {
  title: string
  actions: React.ReactNode | null
}

type CarePilotPageHeaderContextValue = {
  header: HeaderState
  setHeader: React.Dispatch<React.SetStateAction<HeaderState>>
}

const CarePilotPageHeaderContext =
  React.createContext<CarePilotPageHeaderContextValue | null>(null)

export function CarePilotPageHeaderProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [header, setHeader] = React.useState<HeaderState>({
    title: "",
    actions: null,
  })

  const value = React.useMemo(
    () => ({
      header,
      setHeader,
    }),
    [header, setHeader]
  )

  return (
    <CarePilotPageHeaderContext.Provider value={value}>
      {children}
    </CarePilotPageHeaderContext.Provider>
  )
}

/** Shell header: sidebar trigger, page title, optional actions (from {@link CarePilotSetHeader}). */
export function CarePilotShellHeaderRow() {
  const ctx = React.useContext(CarePilotPageHeaderContext)
  const pathname = usePathname()
  const fallback = getCarePilotFallbackTitle(pathname)
  const header = ctx?.header ?? { title: "", actions: null }
  const title = header.title || fallback

  return (
    <header className="flex min-h-(--header-height) shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-transparent px-4 py-3 text-foreground sm:px-6 md:h-(--header-height) md:flex-nowrap md:py-[28px]">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <SidebarTrigger className="-ml-1 shrink-0 self-center" />
        <h1 className="m-0 truncate text-lg leading-snug font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      {header.actions ? (
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 md:w-auto">
          {header.actions}
        </div>
      ) : null}
    </header>
  )
}

/** Registers title and optional right-aligned actions for {@link CarePilotShellHeaderRow}. */
export function CarePilotSetHeader({
  title,
  actions,
}: {
  title: string
  actions?: React.ReactNode
}) {
  const ctx = React.useContext(CarePilotPageHeaderContext)
  const setHeader = ctx?.setHeader

  React.useLayoutEffect(() => {
    if (!setHeader) return
    setHeader({ title, actions: actions ?? null })
    return () => setHeader({ title: "", actions: null })
  }, [title, actions, setHeader])

  return null
}
