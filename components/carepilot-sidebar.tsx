"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconBook,
  IconBookFilled,
  IconCloudComputing,
  IconCloudComputingFilled,
  IconExchange,
  IconExchangeFilled,
  IconGauge,
  IconGaugeFilled,
  IconLayoutDashboard,
  IconLayoutDashboardFilled,
  IconSettings,
  IconSettingsFilled,
  IconTicket,
  IconTicketFilled,
  IconVersions,
  IconVersionsFilled,
} from "@tabler/icons-react"

import { CarePilotSidebarFooter } from "@/components/carepilot-sidebar-footer"
import { TablerSidebarNavIcons } from "@/components/tabler-nav-icons"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  Outline: React.ComponentType<{ className?: string }>
  Filled: React.ComponentType<{ className?: string }>
}

function navIsActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`)
}

const mainNav: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    Outline: IconLayoutDashboard,
    Filled: IconLayoutDashboardFilled,
  },
  {
    title: "Tickets FO VLP",
    url: "/tickets",
    Outline: IconTicket,
    Filled: IconTicketFilled,
  },
  {
    title: "Similar Tickets",
    url: "/similar",
    Outline: IconVersions,
    Filled: IconVersionsFilled,
  },
  {
    title: "KM Procedures",
    url: "/km",
    Outline: IconBook,
    Filled: IconBookFilled,
  },
  {
    title: "Escalation & Transfer Assistance",
    url: "/escalation-transfer",
    Outline: IconExchange,
    Filled: IconExchangeFilled,
  },
  {
    title: "Synchronization",
    url: "/sync",
    Outline: IconCloudComputing,
    Filled: IconCloudComputingFilled,
  },
]

const secondaryNav: NavItem[] = [
  {
    title: "Benchmarks",
    url: "/benchmarks",
    Outline: IconGauge,
    Filled: IconGaugeFilled,
  },
  {
    title: "Settings",
    url: "/settings",
    Outline: IconSettings,
    Filled: IconSettingsFilled,
  },
]

export function CarePilotSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          CAREPILOT
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={navIsActive(pathname, item.url)}
                    className="text-sm"
                  >
                    <Link href={item.url}>
                      <TablerSidebarNavIcons
                        Outline={item.Outline}
                        Filled={item.Filled}
                      />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup className="opacity-90">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={navIsActive(pathname, item.url)}
                    className={
                      item.title === "Benchmarks"
                        ? "text-muted-foreground text-xs"
                        : "text-sm"
                    }
                  >
                    <Link href={item.url}>
                      <TablerSidebarNavIcons
                        Outline={item.Outline}
                        Filled={item.Filled}
                      />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <CarePilotSidebarFooter />
    </Sidebar>
  )
}
