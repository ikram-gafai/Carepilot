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

const workspaceNav = [
  { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent/tickets", label: "All tickets", icon: Ticket },
] as const

const operationsNav = [
  { href: "/agent/actions", label: "Actions", icon: ClipboardCheck },
  { href: "/agent/procedures", label: "Procedures", icon: ScrollText },
] as const

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-[10px] leading-tight">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono font-medium tabular-nums text-zinc-800 dark:text-zinc-200">{value}</span>
    </div>
  )
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-[10px] leading-tight">
      <span className="text-zinc-500">{label}</span>
      <span className="max-w-[52%] truncate text-right font-medium text-zinc-700 dark:text-zinc-300">
        {value}
      </span>
    </div>
  )
}

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string
  items: readonly { href: string; label: string; icon: typeof LayoutDashboard }[]
  pathname: string
}) {
  return (
    <div className="px-2 py-1.5">
      <p className="px-2 pb-1.5 pt-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
      <div className="flex flex-col gap-px">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "border-l-2 border-primary bg-primary/[0.08] pl-[6px] text-foreground shadow-sm ring-1 ring-primary/10 dark:bg-primary/[0.12] dark:text-zinc-50"
                  : "border-l-2 border-transparent pl-[6px] text-zinc-600 hover:border-primary/15 hover:bg-primary/[0.04] hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-100",
              )}
            >
              <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
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
  const active = snapshot?.activeIncidents ?? "—"
  const sla = snapshot?.slaAtRisk ?? "—"
  const actionReq = snapshot?.actionRequired ?? "—"
  const sync = snapshot?.syncLabel ?? "Unknown"
  const lastSyncAt = snapshot?.lastSyncAt
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(snapshot.lastSyncAt),
      )
    : null
  const pressure = snapshot?.slaPressure ?? "—"
  const ai = snapshot?.aiEngine ?? "—"
  const myQueueHref = snapshot?.cpAgentUserId ? "/agent/tickets?mine=1" : "/agent/tickets"
  const myOpen = snapshot?.myOpenTickets ?? 0
  const isMyQueue = pathname === "/agent/tickets" && searchParams.get("mine") === "1"

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-zinc-200/90 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-950/60",
        compact ? "w-[12.25rem]" : "w-56",
      )}
    >
      <div className="flex h-12 items-center border-b border-zinc-200/90 px-3 dark:border-zinc-800">
        <CarePilotBrandMark href="/agent/dashboard" priority />
      </div>

      <nav className="flex flex-col border-b border-zinc-200/80 dark:border-zinc-800">
        <NavGroup title="Workspace" items={workspaceNav} pathname={pathname} />
        {snapshot?.cpAgentUserId ? (
          <div className="px-2 py-1">
            <Link
              href={myQueueHref}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
                isMyQueue
                  ? "border-l-2 border-primary bg-primary/[0.08] pl-[6px] text-foreground shadow-sm ring-1 ring-primary/10 dark:bg-primary/[0.12]"
                  : "border-l-2 border-transparent pl-[6px] text-zinc-600 hover:border-primary/15 hover:bg-primary/[0.04] hover:text-foreground dark:text-zinc-400",
              )}
            >
              <UserRound className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <span className="flex-1">My queue</span>
              <span className="font-mono text-[11px] tabular-nums text-zinc-500">{myOpen}</span>
            </Link>
          </div>
        ) : null}
        <div className="mx-2 h-px bg-zinc-200/70 dark:bg-zinc-800" />
        <NavGroup title="Tools" items={operationsNav} pathname={pathname} />
      </nav>

      <div className="px-2.5 py-2.5">
        <p className="px-2 pb-1.5 text-[10px] font-medium text-zinc-500">Queue</p>
        <div className="rounded border border-zinc-200/80 bg-white/70 px-2 py-1 dark:border-zinc-800/90 dark:bg-zinc-900/40">
          <MetricRow label="Open" value={String(active)} />
          <div className="my-0.5 h-px bg-zinc-100 dark:bg-zinc-800/80" />
          <MetricRow label="SLA at risk" value={String(sla)} />
          <div className="my-0.5 h-px bg-zinc-100 dark:bg-zinc-800/80" />
          <MetricRow label="Needs action" value={String(actionReq)} />
        </div>
      </div>

      <div className="px-2.5 py-2">
        <p className="px-2 pb-1.5 text-[10px] font-medium text-zinc-500">Status</p>
        <div className="rounded border border-zinc-200/80 bg-white/70 px-2 py-1 dark:border-zinc-800/90 dark:bg-zinc-900/40">
          <StatusLine label="Sync" value={sync} />
          {lastSyncAt ? (
            <p className="px-2 pb-1 text-[10px] text-zinc-500">
              Last sync <span className="tabular-nums text-zinc-600">{lastSyncAt}</span>
            </p>
          ) : null}
          <StatusLine label="SLA" value={pressure} />
          <StatusLine label="AI" value={ai} />
        </div>
      </div>

      <div className="mt-auto border-t border-zinc-200/90 dark:border-zinc-800">
        <div className={cn("p-2.5", compact && "p-2")}>
          <AgentSidebarProfile sessionUser={sessionUser} />
        </div>
      </div>
    </aside>
  )
}
