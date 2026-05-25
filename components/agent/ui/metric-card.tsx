import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function MetricCard({
  title,
  value,
  className,
  emphasis,
}: {
  title: string
  value: string
  className?: string
  emphasis?: boolean
}) {
  return (
    <Card
      className={cn(
        "border-border/90 shadow-sm dark:border-zinc-800",
        emphasis && "border-primary/30 ring-1 ring-primary/10",
        className,
      )}
    >
      <CardHeader className="space-y-0 pb-1">
        <div className={cn("text-xs font-medium text-muted-foreground", emphasis && "text-primary")}>{title}</div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
      </CardContent>
    </Card>
  )
}
