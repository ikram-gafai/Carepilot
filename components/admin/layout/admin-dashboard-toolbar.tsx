"use client"

import { Filter, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AdminDashboardToolbar() {
  return (
    <div className="hidden items-center gap-2 sm:flex">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Rechercher…"
          className="h-8 w-[min(17rem,42vw)] border-border/80 bg-background/80 pl-8 text-xs shadow-sm"
          aria-label="Rechercher dans les opérations"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-border/80 text-xs shadow-sm"
      >
        <Filter className="size-3.5 opacity-70" aria-hidden />
        Filtres
      </Button>
    </div>
  )
}
