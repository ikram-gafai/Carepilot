import { cn } from "@/lib/utils"

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-2 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
