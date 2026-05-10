"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  CAREPILOT_ADMIN_LINK_ROUTES,
  CAREPILOT_OPERATION_ROUTES,
} from "@/lib/carepilot-nav-data"

/** Tab `value` for the sidebar Search row (opens palette; not a route). */
export const CAREPILOT_COMMAND_TAB_VALUE = "__carepilot_command__" as const

type CarePilotCommandContextValue = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const CarePilotCommandContext =
  React.createContext<CarePilotCommandContextValue | null>(null)

export function useCarePilotCommand() {
  const ctx = React.useContext(CarePilotCommandContext)
  if (!ctx) {
    throw new Error("useCarePilotCommand must be used within CarePilotCommandProvider")
  }
  return ctx
}

export function CarePilotCommandProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const value = React.useMemo(() => ({ open, setOpen }), [open])

  return (
    <CarePilotCommandContext.Provider value={value}>
      {children}
    </CarePilotCommandContext.Provider>
  )
}

export function CarePilotCommandMenu() {
  const router = useRouter()
  const { open, setOpen } = useCarePilotCommand()

  const run = React.useCallback(
    (url: string) => {
      router.push(url)
      setOpen(false)
    },
    [router, setOpen]
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Jump to a page in CAREPILOT"
      showCloseButton={false}
      className="max-w-lg sm:max-w-xl"
    >
      <Command shouldFilter loop>
        <CommandInput placeholder="Search pages…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Operations">
            {CAREPILOT_OPERATION_ROUTES.map((r) => (
              <CommandItem key={r.url} value={`${r.title} ${r.url}`} onSelect={() => run(r.url)}>
                {r.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Administration">
            {CAREPILOT_ADMIN_LINK_ROUTES.map((r) => (
              <CommandItem key={r.url} value={`${r.title} ${r.url}`} onSelect={() => run(r.url)}>
                {r.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
