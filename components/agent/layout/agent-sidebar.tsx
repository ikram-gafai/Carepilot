"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ClipboardCheck, LayoutDashboard, ScrollText, Ticket, UserRound } from "lucide-react"

import { CarePilotBrandMark } from "@/components/carepilot-brand-mark"
import { AgentSidebarProfile } from "@/components/agent/layout/agent-sidebar-profile"
import type { CarePilotSessionUser } from "@/lib/auth/session"
import { useAgentPreferences } from "@/components/agent/layout/agent-preferences-context"
import type { AgentSidebarSnapshot } from "@/lib/agent-sidebar"
import { cn } from "@/lib/utils"

const overviewNav = [
  { href: "/agent/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
] as const

const queueNav = [{ href: "/agent/tickets", label: "Backlog", icon: Ticket }] as const

const operationsNav = [
  { href: "/agent/actions", label: "Actions", icon: ClipboardCheck },
  { href: "/agent/procedures", label: "Procédures", icon: ScrollText },
] as const

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

function navLinkClass(active: boolean) {
  return cn(
    "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors",
    active
      ? "bg-primary/[0.08] text-foreground shadow-sm ring-1 ring-primary/10 dark:bg-primary/[0.12] dark:text-zinc-50"
      : "text-zinc-600 hover:bg-primary/[0.04] hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-100",
  )
}

function NavGroup({
  title,
  items,
  pathname,
  isItemActive,
  children,
}: {
  title: string
  items: readonly NavItem[]
  pathname: string
  isItemActive?: (item: NavItem) => boolean
  children?: React.ReactNode
}) {
  return (
    <div className="px-2 py-1">
      <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {title}
      </p>
      <div className="flex flex-col gap-px">
        {items.map((item) => {
          const active = isItemActive ? isItemActive(item) : pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} className={navLinkClass(active)}>
              <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {item.label}
            </Link>
          )
        })}
        {children}
      </div>
    </div>
  )
}

function SidebarDivider() {
  return <div className="mx-3 my-1 h-px bg-zinc-200/90 dark:bg-zinc-800" />
}

export function AgentSidebar({
  pathname,
  snapshot,
  sessionUser,
}: {
  pathname: string
  snapshot: AgentSidebarSnapshot | null
  sessionUser?: CarePilotSessionUser | null
}) {
  const { compact } = useAgentPreferences()
  const searchParams = useSearchParams()
  const myQueueHref = snapshot?.cpAgentUserId ? "/agent/tickets?mine=1" : "/agent/tickets"
  const myOpen = snapshot?.myOpenTickets ?? 0
  const isMyQueue = pathname === "/agent/tickets" && searchParams.get("mine") === "1"
  const isBacklog = pathname === "/agent/tickets" && searchParams.get("mine") !== "1"

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-r border-zinc-200/90 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-950/60",
        compact ? "w-[12.25rem]" : "w-[13.5rem]",
      )}
    >
      <div className="flex h-12 shrink-0 items-center border-b border-zinc-200/90 px-3 dark:border-zinc-800">
        <CarePilotBrandMark href="/agent/dashboard" priority />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto border-b border-zinc-200/90 py-2 dark:border-zinc-800">
        <NavGroup title="Vue d'ensemble" items={overviewNav} pathname={pathname} />
        <SidebarDivider />
        <NavGroup
          title="File"
          items={queueNav}
          pathname={pathname}
          isItemActive={(item) => (item.href === "/agent/tickets" ? isBacklog : pathname === item.href)}
        >
          {snapshot?.cpAgentUserId ? (
            <Link href={myQueueHref} className={navLinkClass(isMyQueue)}>
              <UserRound className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <span className="flex-1">Affectation</span>
              <span className="font-mono text-[11px] tabular-nums text-zinc-500">{myOpen}</span>
            </Link>
          ) : null}
        </NavGroup>
        <SidebarDivider />
        <NavGroup title="Opérations" items={operationsNav} pathname={pathname} />
      </nav>

      <div className="shrink-0 border-t border-zinc-200/90 dark:border-zinc-800">
        <div className={cn("p-2.5", compact && "p-2")}>
          <AgentSidebarProfile sessionUser={sessionUser} />
        </div>
      </div>
    </aside>
  )
}
