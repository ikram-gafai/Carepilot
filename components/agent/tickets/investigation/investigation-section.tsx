import { cn } from "@/lib/utils"

export function InvestigationSection({
  title,
  children,
  className,
  trailing,
}: {
  title: string
  children: React.ReactNode
  className?: string
  trailing?: React.ReactNode
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
        {trailing}
      </div>
      {children}
    </section>
  )
}
