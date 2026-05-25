import { cn } from "@/lib/utils"

export function AdminSection({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <div>
        <h2 className="text-sm font-medium text-zinc-800">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[10px] text-zinc-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}
