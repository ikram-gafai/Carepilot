"use client"

import type * as React from "react"

import { CarePilotSidebar } from "@/components/carepilot-sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export function CarePilotShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "15.5rem",
          "--header-height": "2.75rem",
        } as React.CSSProperties
      }
    >
      <CarePilotSidebar variant="inset" />
      <SidebarInset className="bg-[var(--care-surface)] md:peer-data-[variant=inset]:shadow-none">
        <header className="flex h-[var(--header-height)] shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <span className="truncate text-sm font-semibold tracking-tight text-foreground">
            CAREPILOT
          </span>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
