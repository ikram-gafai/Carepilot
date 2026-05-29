import { cn } from "@/lib/utils"

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn("py-12 text-center text-sm text-muted-foreground", className)}>
      <p>{description ? `${title} — ${description}` : title}</p>
    </div>
  )
}
