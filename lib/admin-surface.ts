/** Shared admin surfaces — zinc chrome with dark mode support. */
export const adminSurfaces = {
  page: "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
  shell: "bg-zinc-50 dark:bg-zinc-950",
  sidebar: "border-zinc-200/90 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-950/60",
  sidebarDivider: "bg-zinc-200/70 dark:bg-zinc-800",
  sidebarBorder: "border-zinc-200/90 dark:border-zinc-800",
  header: "border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80",
  body: "bg-zinc-50 dark:bg-zinc-950",
  card: "rounded-xl border border-border/90 bg-card shadow-sm dark:border-zinc-800",
  cardPrimary: "rounded-xl border border-primary/15 bg-card shadow-sm",
  cardAccent: "rounded-xl border border-border/90 bg-card shadow-sm dark:border-zinc-800",
  panel: "rounded-xl border border-border/90 bg-card p-3 shadow-sm dark:border-zinc-800",
  panelAccent: "rounded-xl border border-border/90 bg-card p-3 shadow-sm dark:border-zinc-800",
  metric: "rounded-xl border border-border/90 bg-card px-3 py-2.5 shadow-sm dark:border-zinc-800",
  list: "divide-y divide-border/80 rounded-xl border border-border/90 bg-card shadow-sm dark:border-zinc-800",
  tableWrap: "overflow-hidden rounded-xl border border-border/90 bg-card shadow-sm dark:border-zinc-800",
  tableHead: "bg-muted/40",
  tableRow: "border-border/60 hover:bg-muted/30",
  tableBodyRow: "border-border/50",
  navActive:
    "border-l-2 border-zinc-900 bg-zinc-100/80 pl-[6px] text-foreground dark:border-zinc-100 dark:bg-zinc-800/80 dark:text-zinc-50",
  navIdle:
    "border-l-2 border-transparent pl-[6px] text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100/60 hover:text-foreground dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-100",
} as const
