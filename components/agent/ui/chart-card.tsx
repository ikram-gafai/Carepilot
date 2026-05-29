import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function ChartCard({
  title,
  description,
  children,
  headerExtra,
  className,
}: {
  title: string
  description?: string
  headerExtra?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("flex h-full flex-col border-border/60 shadow-none", className)}>
      <CardHeader className="gap-0.5 space-y-0 px-4 pb-0 pt-3">
        <CardTitle className="text-[13px] font-semibold tracking-tight">{title}</CardTitle>
        {description ? (
          <p className="text-[11px] leading-snug text-muted-foreground">{description}</p>
        ) : null}
        {headerExtra}
      </CardHeader>
      <CardContent className="min-w-0 flex-1 px-4 pb-4 pt-3">{children}</CardContent>
    </Card>
  )
}
