/** Carrefour enterprise blue — matches `--primary` (#6385a9). */
export const ADMIN_CHART_BLUE = {
  deep: "color-mix(in oklab, var(--primary) 78%, #1e3a5f)",
  base: "var(--primary)",
  mid: "color-mix(in oklab, var(--primary) 72%, white)",
  soft: "color-mix(in oklab, var(--primary) 45%, white)",
  fill: "color-mix(in oklab, var(--primary) 14%, transparent)",
} as const

/** Semantic hues — use only for risk, failure, or escalation series. */
export const ADMIN_CHART_SEMANTIC = {
  warning: "hsl(38 92% 50%)",
  critical: "hsl(0 72% 51%)",
} as const

export const ADMIN_CHART_TICK = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
} as const

export const ADMIN_CHART_TICK_CATEGORY = {
  fontSize: 11,
  fill: "hsl(var(--foreground))",
} as const

export const ADMIN_CHART_GRID = {
  strokeDasharray: "4 4",
  className: "stroke-border/40",
} as const

export const ADMIN_PIE_BLUE_STEPS = [
  ADMIN_CHART_BLUE.deep,
  ADMIN_CHART_BLUE.base,
  ADMIN_CHART_BLUE.mid,
  ADMIN_CHART_BLUE.soft,
] as const

export const ADMIN_CHART_HEIGHT = {
  main: "aspect-auto h-[min(15.5rem,52vh)] w-full min-h-[248px] min-w-0",
  pressure: "aspect-auto h-[min(16rem,42vh)] w-full min-h-[220px] min-w-0",
  compact: "aspect-auto h-[200px] w-full min-w-0",
  donut: "mx-auto aspect-auto h-[200px] w-full max-w-[220px] min-w-0",
} as const
