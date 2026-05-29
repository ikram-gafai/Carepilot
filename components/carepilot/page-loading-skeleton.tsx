import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function PageLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-4", className)} aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}

export function TicketPanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement du ticket">
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

export function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  )
}
