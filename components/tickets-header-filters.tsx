"use client"

import * as React from "react"
import { IconChevronDown, IconReload } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const triggerClass =
  "h-8 min-w-[7.5rem] shrink-0 justify-between gap-2 rounded-md border-border bg-background px-2.5 text-xs font-normal shadow-none dark:bg-background"

const DEMO_OPTIONS = [
  { value: "all", label: "All" },
  { value: "sample-a", label: "Sample A" },
  { value: "sample-b", label: "Sample B" },
] as const

function LabeledFilterDropdown({ label }: { label: string }) {
  const [value, setValue] = React.useState<string>("all")
  const selected = DEMO_OPTIONS.find((o) => o.value === value)?.label ?? "All"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={triggerClass}
          aria-label={`${label} filter, ${selected}`}
        >
          <span className="flex min-w-0 items-center gap-0.5">
            <span className="shrink-0 text-muted-foreground">{label}:</span>
            <span className="truncate">{selected}</span>
          </span>
          <IconChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36 rounded-md">
        <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
          {DEMO_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem
              key={opt.value}
              value={opt.value}
              className="text-xs"
            >
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Icon-only refresh control for the tickets shell header (rightmost slot via {@link CarePilotSetHeader} `trailingActions`). */
export function TicketsHeaderRefreshButton() {
  const [refreshTurns, setRefreshTurns] = React.useState(0)

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="size-8 shrink-0 rounded-md border-border bg-background shadow-none dark:bg-background"
      aria-label="Refresh last updated"
      title="Refresh last updated"
      onClick={() => setRefreshTurns((n) => n + 1)}
    >
      <IconReload
        className={cn(
          "size-4 text-muted-foreground transition-transform duration-500 ease-out",
          "motion-reduce:duration-0"
        )}
        style={{ transform: `rotate(${refreshTurns * 360}deg)` }}
        aria-hidden
      />
    </Button>
  )
}

/** Demo filter strip for the tickets shell header (non-functional). */
export function TicketsHeaderFilters() {
  const [query, setQuery] = React.useState("")

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 md:w-auto md:max-w-none">
      <LabeledFilterDropdown label="Status" />
      <LabeledFilterDropdown label="Perimeter" />
      <LabeledFilterDropdown label="Category" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tickets..."
        className="h-8 min-w-[min(100%,12rem)] flex-1 rounded-md border-border bg-background text-xs shadow-none sm:min-w-56 sm:max-w-xs md:max-w-[220px] dark:bg-background"
        aria-label="Search tickets"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 rounded-md border-border bg-background text-xs shadow-none dark:bg-background"
        onClick={() => {}}
      >
        Filter
      </Button>
    </div>
  )
}
