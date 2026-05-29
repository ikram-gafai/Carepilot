import { cn } from "@/lib/utils"

export function AdminAlignmentBadge({ label }: { label: string }) {
  const tone =
    label === "Aligné"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : label === "Contourné"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground"

  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", tone)}>
      {label}
    </span>
  )
}
