import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

export function AgentHeader({
  title,
  children,
}: {
  title?: string
  children?: ReactNode
}) {
  if (!title && !children) return null

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-border/80 bg-background/95 px-4 py-2.5 backdrop-blur sm:px-6",
      )}
    >
      {title ? (
        <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground">{title}</h1>
      ) : (
        <div className="min-w-0 flex-1" />
      )}
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </header>
  )
}

export function AgentPageBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex min-h-full flex-col", className)} {...props} />
}
