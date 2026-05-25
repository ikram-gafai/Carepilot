import { Inbox } from "lucide-react"

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
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/30",
        className,
      )}
    >
      <Inbox className="mb-3 size-8 text-zinc-400" aria-hidden />
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
      {description ? <p className="mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">{description}</p> : null}
    </div>
  )
}
