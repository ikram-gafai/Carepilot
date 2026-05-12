"use client"

import Link from "next/link"

import { IconDotsVertical } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function TicketsDemoRowActions({
  ticketId,
  detailHref,
}: {
  ticketId: string
  detailHref: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8 text-muted-foreground hover:text-foreground"
          aria-label={`Actions for ${ticketId}`}
        >
          <IconDotsVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem asChild>
          <Link href={detailHref} className="cursor-pointer text-xs">
            Open ticket
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="text-xs">
          Copy ticket ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          {ticketId}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
