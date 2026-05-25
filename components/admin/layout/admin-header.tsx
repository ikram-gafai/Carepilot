import type { ComponentProps, ReactNode } from "react"

import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

export function AdminHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4",
        adminSurfaces.header,
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold tracking-tight text-zinc-900">{title}</h1>
        {description ? <p className="truncate text-[11px] text-zinc-500">{description}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </header>
  )
}

export function AdminPageBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("min-h-[calc(100vh-3rem)] flex-1 overflow-auto", adminSurfaces.body, className)} {...props} />
}
