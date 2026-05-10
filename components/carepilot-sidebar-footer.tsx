"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  IconChevronDown,
  IconDeviceDesktop,
  IconHome,
  IconLogout,
  IconMoon,
  IconSettings,
  IconSun,
} from "@tabler/icons-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const DEFAULT_USER = {
  name: "Ikram Gafai",
  email: "console.carepilot@interne.local",
  /** Shown under the name; falls back to `email` when omitted. */
  subtitle: "Super Admin",
  avatar: "" as string | undefined,
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "CP"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

export function CarePilotSidebarFooter({
  user = DEFAULT_USER,
}: {
  user?: { name: string; email: string; subtitle?: string; avatar?: string }
}) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const profileLine = user.subtitle ?? user.email

  return (
    <SidebarFooter className="gap-0 border-t border-sidebar-border p-0">
      <SidebarMenu className="p-2">
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={`${user.name} — ${profileLine}`}
                className={cn(
                  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-xl px-2 py-2 text-left text-sm text-sidebar-foreground ring-sidebar-ring outline-none transition-[width,height,padding]",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-full! group-data-[collapsible=icon]:p-0!",
                  "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                )}
              >
                <span
                  className="relative shrink-0 overflow-hidden rounded-full ring-1 ring-sidebar-border"
                  aria-hidden
                >
                  <Avatar className="size-8 rounded-full">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt="" />
                    ) : null}
                    <AvatarFallback className="rounded-full text-xs font-medium">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </span>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {profileLine}
                  </span>
                </div>
                <IconChevronDown className="ml-auto size-5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[min(17rem,calc(100vw-2rem))] rounded-2xl p-1.5"
              side={isMobile ? "bottom" : "top"}
              align="start"
              sideOffset={8}
            >
              <div className="flex items-center gap-2 rounded-xl px-2 py-2">
                <span className="relative shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                  <Avatar className="size-10 rounded-full">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt="" />
                    ) : null}
                    <AvatarFallback className="rounded-full text-sm font-medium">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </span>
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {profileLine}
                  </span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide">
                Thème
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={
                  theme === "dark" ? "dark" : theme === "light" ? "light" : "system"
                }
                onValueChange={(v) => setTheme(v)}
              >
                <DropdownMenuRadioItem
                  value="light"
                  className="gap-2 rounded-xl py-2 pl-2 [&_svg]:size-5!"
                >
                  <IconSun className="opacity-70" />
                  Clair
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="dark"
                  className="gap-2 rounded-xl py-2 pl-2 [&_svg]:size-5!"
                >
                  <IconMoon className="opacity-70" />
                  Sombre
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="system"
                  className="gap-2 rounded-xl py-2 pl-2 [&_svg]:size-5!"
                >
                  <IconDeviceDesktop className="opacity-70" />
                  Système
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 rounded-xl py-2 [&_svg]:size-5!"
                onClick={() => router.push("/settings")}
              >
                <IconSettings className="opacity-70" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 rounded-xl py-2 [&_svg]:size-5!"
                onClick={() => router.push("/")}
              >
                <IconHome className="opacity-70" />
                Retour à l&apos;accueil
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 rounded-xl py-2 [&_svg]:size-5!"
                variant="destructive"
                onClick={() => {
                  window.location.href = "/"
                }}
              >
                <IconLogout />
                Quitter la console
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}
