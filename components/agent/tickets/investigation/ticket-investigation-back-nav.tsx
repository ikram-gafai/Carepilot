import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export function TicketInvestigationBackNav() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      asChild
    >
      <Link href="/agent/tickets">
        <ArrowLeft className="size-3.5 shrink-0 opacity-70" aria-hidden />
        Retour aux tickets
      </Link>
    </Button>
  )
}
