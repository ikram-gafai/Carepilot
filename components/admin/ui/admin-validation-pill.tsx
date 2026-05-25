import { cn } from "@/lib/utils"

const neutralBadge = "border-border/80 bg-muted/30 text-zinc-600 font-normal"

const MAP = {
  Accepted: neutralBadge,
  Rejected: cn(neutralBadge, "font-medium text-destructive"),
  Pending: neutralBadge,
} as const

export function AdminValidationPill({ status }: { status: keyof typeof MAP }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        MAP[status],
      )}
    >
      {status}
    </span>
  )
}
