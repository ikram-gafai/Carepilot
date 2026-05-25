"use client"

import * as React from "react"

import type { CarePilotSessionUser } from "@/lib/auth/session"

import {
  CarePilotCommandMenu,
  CarePilotCommandProvider,
  useCarePilotCommand,
} from "@/components/carepilot-command"
import { CarePilotSidebar } from "@/components/carepilot-sidebar"
import {
  CarePilotPageHeaderProvider,
  CarePilotShellHeaderRow,
} from "@/components/carepilot-page-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

function CarePilotSearchShortcut() {
  const { setOpen } = useCarePilotCommand()

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key !== "k" && e.key !== "K") return

      const el = e.target as HTMLElement | null
      if (!el) return
      const tag = el.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (el.isContentEditable) return

      e.preventDefault()
      setOpen((o) => !o)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [setOpen])

  return null
}

export function CarePilotShell({
  children,
  sessionUser,
}: {
  children: React.ReactNode
  /** When set, sidebar shows signed-in CarePilot user (requires DB + session). */
  sessionUser?: CarePilotSessionUser | null
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "15.5rem",
          "--header-height": "2.75rem",
        } as React.CSSProperties
      }
    >
      <CarePilotCommandProvider>
        <CarePilotSearchShortcut />
        <CarePilotSidebar variant="inset" sessionUser={sessionUser} />
        <CarePilotPageHeaderProvider>
          <SidebarInset className="bg-card text-card-foreground md:peer-data-[variant=inset]:overflow-hidden md:peer-data-[variant=inset]:rounded-2xl">
            <CarePilotShellHeaderRow />
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">{children}</div>
          </SidebarInset>
        </CarePilotPageHeaderProvider>
        <CarePilotCommandMenu />
      </CarePilotCommandProvider>
    </SidebarProvider>
  )
}
