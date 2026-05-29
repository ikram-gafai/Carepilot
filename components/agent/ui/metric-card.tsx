import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function MetricCard({
  title,
  value,
  hint,
  className,
  emphasis,
}: {
  title: string
  value: string
  hint?: string
  className?: string
  emphasis?: boolean
}) {
  return (
    <Card
      className={cn(
        "border-border/80 shadow-none dark:border-zinc-800",
        emphasis && "border-primary/25",
        className,
      )}
    >
      <CardHeader className="space-y-0 pb-1">
        <div className={cn("text-xs font-medium text-muted-foreground", emphasis && "text-primary")}>{title}</div>
        {hint ? <p className="text-[10px] text-muted-foreground/80">{hint}</p> : null}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
      </CardContent>
    </Card>
  )
}
