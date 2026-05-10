"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
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
  IconSearch,
  IconSearchFilled,
  IconSettings,
  IconSettingsFilled,
  IconTicket,
  IconTicketFilled,
  IconVersions,
  IconVersionsFilled,
} from "@tabler/icons-react"

import {
  CAREPILOT_COMMAND_TAB_VALUE,
  useCarePilotCommand,
} from "@/components/carepilot-command"
import { CarePilotSidebarFooter } from "@/components/carepilot-sidebar-footer"
import { TablerTabsTriggerIcons } from "@/components/tabler-nav-icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  CAREPILOT_ADMIN_LINK_ROUTES,
  CAREPILOT_OPERATION_ROUTES,
} from "@/lib/carepilot-nav-data"

type NavItem = {
  title: string
  url: string
  Outline: React.ComponentType<{ className?: string }>
  Filled: React.ComponentType<{ className?: string }>
  /** Trailing shortcut chips (e.g. Ctrl + K). Hidden when sidebar is icon-collapsed. */
  shortcutKeys?: readonly string[]
}

const OPERATION_ICONS: Record<
  string,
  {
    Outline: React.ComponentType<{ className?: string }>
    Filled: React.ComponentType<{ className?: string }>
  }
> = {
  "/dashboard": {
    Outline: IconLayoutDashboard,
    Filled: IconLayoutDashboardFilled,
  },
  "/tickets": { Outline: IconTicket, Filled: IconTicketFilled },
  "/similar": { Outline: IconVersions, Filled: IconVersionsFilled },
  "/km": { Outline: IconBook, Filled: IconBookFilled },
  "/escalation-transfer": {
    Outline: IconExchange,
    Filled: IconExchangeFilled,
  },
  "/sync": {
    Outline: IconCloudComputing,
    Filled: IconCloudComputingFilled,
  },
}

const mainNav: NavItem[] = CAREPILOT_OPERATION_ROUTES.map((r) => {
  const icons = OPERATION_ICONS[r.url]
  return { title: r.title, url: r.url, Outline: icons.Outline, Filled: icons.Filled }
})

const ADMIN_LINK_ICONS: Record<
  string,
  {
    Outline: React.ComponentType<{ className?: string }>
    Filled: React.ComponentType<{ className?: string }>
  }
> = {
  "/benchmarks": { Outline: IconGauge, Filled: IconGaugeFilled },
  "/settings": { Outline: IconSettings, Filled: IconSettingsFilled },
}

const adminLinkNav: NavItem[] = CAREPILOT_ADMIN_LINK_ROUTES.map((r) => {
  const icons = ADMIN_LINK_ICONS[r.url]
  return { title: r.title, url: r.url, Outline: icons.Outline, Filled: icons.Filled }
})

const secondaryNav: NavItem[] = [
  {
    title: "Search",
    url: CAREPILOT_COMMAND_TAB_VALUE,
    Outline: IconSearch,
    Filled: IconSearchFilled,
    shortcutKeys: ["Ctrl", "K"],
  },
  ...adminLinkNav,
]

function navIsActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`)
}

function navSectionValue(pathname: string, items: NavItem[]) {
  return items.find((i) => navIsActive(pathname, i.url))?.url
}

const tabTriggerClass = cn(
  "h-auto min-h-8 w-full justify-start gap-2 rounded-full px-3 py-2 text-left text-sm font-normal sm:h-auto sm:px-3",
  "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:min-h-8 group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0!",
  "group-data-[collapsible=icon]:[&_svg]:mx-0!",
  "group-data-[collapsible=icon]:grow-0! group-data-[collapsible=icon]:!w-8 group-data-[collapsible=icon]:shrink-0",
  "data-active:text-primary"
)

const tabLabelClass = cn(
  "min-w-0 flex-1 truncate text-left group-data-[collapsible=icon]:sr-only"
)

export function CarePilotSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { open: commandOpen, setOpen: setCommandOpen } = useCarePilotCommand()

  const mainValue = navSectionValue(pathname, mainNav)
  const adminLinkValue = navSectionValue(pathname, adminLinkNav)
  const secondaryTabValue = commandOpen
    ? CAREPILOT_COMMAND_TAB_VALUE
    : (adminLinkValue ?? null)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex items-center gap-2 px-3 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Image
          src="/logo/carrefour.svg"
          alt=""
          width={131}
          height={82}
          className="h-5 w-auto shrink-0 object-contain object-left group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:max-h-8 group-data-[collapsible=icon]:max-w-8"
          priority
        />
        <span className="min-w-0 text-sm font-semibold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:sr-only">
          CAREPILOT
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="min-h-0 flex-1">
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <Tabs
              orientation="vertical"
              className="w-full gap-0"
              value={mainValue ?? null}
              onValueChange={(v) => {
                setCommandOpen(false)
                router.push(String(v))
              }}
            >
              <TabsList
                variant="default"
                className="h-auto w-full flex-col gap-0.5 rounded-[20px] bg-sidebar-accent/40 p-1 text-sidebar-foreground"
              >
                {mainNav.map((item) => (
                  <TabsTrigger
                    key={item.url}
                    value={item.url}
                    title={item.title}
                    className={tabTriggerClass}
                  >
                    <TablerTabsTriggerIcons
                      Outline={item.Outline}
                      Filled={item.Filled}
                    />
                    <span className={tabLabelClass}>{item.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto shrink-0 pt-2">
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <Tabs
              orientation="vertical"
              className="w-full gap-0"
              value={secondaryTabValue}
              onValueChange={(v) => {
                if (v === CAREPILOT_COMMAND_TAB_VALUE) {
                  setCommandOpen(true)
                  return
                }
                setCommandOpen(false)
                router.push(String(v))
              }}
            >
              <TabsList
                variant="default"
                className="h-auto w-full flex-col gap-0.5 rounded-[20px] bg-sidebar-accent/40 p-1 text-sidebar-foreground"
              >
                {secondaryNav.map((item) => (
                  <TabsTrigger
                    key={item.url}
                    value={item.url}
                    title={
                      item.shortcutKeys?.length
                        ? `${item.title} (${item.shortcutKeys.join("+")})`
                        : item.title
                    }
                    className={tabTriggerClass}
                  >
                    <TablerTabsTriggerIcons
                      Outline={item.Outline}
                      Filled={item.Filled}
                    />
                    <span className={tabLabelClass}>{item.title}</span>
                    {item.shortcutKeys ? (
                      <span className="pointer-events-none ml-auto hidden shrink-0 gap-0.5 group-data-[collapsible=icon]:hidden sm:inline-flex">
                        {item.shortcutKeys.map((key) => (
                          <kbd
                            key={key}
                            className="rounded border border-sidebar-border bg-sidebar px-1 py-px font-mono text-[10px] font-medium text-muted-foreground shadow-xs"
                          >
                            {key}
                          </kbd>
                        ))}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <CarePilotSidebarFooter />
    </Sidebar>
  )
}
