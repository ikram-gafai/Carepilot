/** Shared light-mode surfaces — agent-aligned zinc chrome (no primary tint). */
export const adminSurfaces = {
  page: "bg-zinc-50 text-zinc-900",
  shell: "bg-zinc-50",
  sidebar: "border-zinc-200/90 bg-zinc-50/90",
  sidebarDivider: "bg-zinc-200/70",
  header: "border-zinc-200 bg-white/90 backdrop-blur",
  body: "bg-zinc-50",
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
  navActive: "border-l-2 border-zinc-900 bg-zinc-100/80 pl-[6px] text-foreground",
  navIdle:
    "border-l-2 border-transparent pl-[6px] text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100/60 hover:text-foreground",
} as const
