/**
 * Rules for CarePilot charts:
 * - One series → default brand (`var(--primary)`).
 * - Two or three series → distinct brand tints (`--chart-1` … `--chart-3`), no extra primary slot.
 * - More than three → first series is brand primary; additional series cycle brand shades
 *   (`--chart-1`, `--chart-2`, `--chart-4`, `--chart-5`) so `--chart-3` is not duplicated after primary.
 */
export const CHART_BRAND_PRIMARY = "var(--primary)" as const

const SHADES_TWO_OR_THREE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
] as const

const SHADES_AFTER_PRIMARY = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

export function getChartSeriesColors(seriesCount: number): string[] {
  if (seriesCount <= 0) return []
  if (seriesCount === 1) return [CHART_BRAND_PRIMARY]
  if (seriesCount <= 3) {
    return Array.from(
      { length: seriesCount },
      (_, i) => SHADES_TWO_OR_THREE[i]!
    )
  }
  const colors: string[] = [CHART_BRAND_PRIMARY]
  for (let i = 1; i < seriesCount; i++) {
    colors.push(
      SHADES_AFTER_PRIMARY[(i - 1) % SHADES_AFTER_PRIMARY.length]!
    )
  }
  return colors
}
