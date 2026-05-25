import { cn } from "@/lib/utils"

export function AgentHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        {description ? (
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </header>
  )
}

export function AgentPageBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("min-h-[calc(100vh-3.5rem)] flex-1 overflow-auto", className)} {...props} />
}
