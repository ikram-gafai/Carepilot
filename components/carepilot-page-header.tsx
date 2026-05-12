"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { CarePilotHeaderDatePicker } from "@/components/carepilot-header-date-picker"
import { getCarePilotFallbackTitle } from "@/lib/carepilot-route-titles"
import { SidebarTrigger } from "@/components/ui/sidebar"

type HeaderState = {
  title: string
  /** When set with {@link HeaderState.breadcrumbHref}, the shell renders `label | title`. */
  breadcrumbLabel: string | null
  breadcrumbHref: string | null
  actions: React.ReactNode | null
  /** Rendered after the shell date picker (e.g. rightmost toolbar control). */
  trailingActions: React.ReactNode | null
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
    breadcrumbLabel: null,
    breadcrumbHref: null,
    actions: null,
    trailingActions: null,
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
  const header = ctx?.header ?? {
    title: "",
    breadcrumbLabel: null,
    breadcrumbHref: null,
    actions: null,
    trailingActions: null,
  }
  const hasBreadcrumb = Boolean(header.breadcrumbLabel && header.breadcrumbHref)
  const mainTitle = header.title || fallback
  const hideHeaderDatePicker = /^\/tickets\/.+/.test(pathname)

  return (
    <header className="flex min-h-(--header-height) shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-transparent px-4 py-3 text-foreground sm:px-6 md:h-(--header-height) md:flex-nowrap md:py-[28px]">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <SidebarTrigger className="-ml-1 shrink-0 self-center" />
        <h1 className="m-0 flex min-w-0 items-center gap-2 text-lg leading-snug font-semibold tracking-tight text-foreground">
          {hasBreadcrumb ? (
            <>
              <Link
                href={header.breadcrumbHref!}
                className="shrink-0 font-normal text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {header.breadcrumbLabel}
              </Link>
              <span className="shrink-0 font-normal text-muted-foreground/70" aria-hidden>
                |
              </span>
              <span className="min-w-0 truncate">{mainTitle}</span>
            </>
          ) : (
            <span className="min-w-0 truncate">{mainTitle}</span>
          )}
        </h1>
      </div>
      <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 md:w-auto md:flex-nowrap">
        {header.actions}
        {hideHeaderDatePicker ? null : <CarePilotHeaderDatePicker />}
        {header.trailingActions}
      </div>
    </header>
  )
}

/** Registers title and optional right-aligned actions for {@link CarePilotShellHeaderRow}. */
export function CarePilotSetHeader({
  title,
  breadcrumbLabel,
  breadcrumbHref,
  actions,
  trailingActions,
}: {
  title: string
  /** First segment before `|`, linked to this href (e.g. Tickets → `/tickets`). */
  breadcrumbLabel?: string
  breadcrumbHref?: string
  actions?: React.ReactNode
  trailingActions?: React.ReactNode
}) {
  const ctx = React.useContext(CarePilotPageHeaderContext)
  const setHeader = ctx?.setHeader

  React.useLayoutEffect(() => {
    if (!setHeader) return
    setHeader({
      title,
      breadcrumbLabel: breadcrumbLabel ?? null,
      breadcrumbHref: breadcrumbHref ?? null,
      actions: actions ?? null,
      trailingActions: trailingActions ?? null,
    })
    return () =>
      setHeader({
        title: "",
        breadcrumbLabel: null,
        breadcrumbHref: null,
        actions: null,
        trailingActions: null,
      })
  }, [title, breadcrumbLabel, breadcrumbHref, actions, trailingActions, setHeader])

  return null
}
