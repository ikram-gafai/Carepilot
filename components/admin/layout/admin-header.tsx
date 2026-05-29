import type { ComponentProps, ReactNode } from "react"

import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

export function AdminHeader({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children?: ReactNode
}) {
  if (!title && !children) return null

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3 sm:px-6",
        adminSurfaces.header,
      )}
    >
      {title ? (
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </header>
  )
}

export function AdminPageBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("min-h-0 flex-1 overflow-auto", adminSurfaces.body, className)} {...props} />
}
