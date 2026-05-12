"use client"

import { useChart } from "./chart-context"

export interface BarVerticalValueAxisProps {
  /** Approximate tick count for the value (Y) axis. Default 5 */
  numTicks?: number
}

/** Left-side numeric tick labels for vertical {@link BarChart} (linear value scale). */
export function BarVerticalValueAxis({
  numTicks = 5,
}: BarVerticalValueAxisProps) {
  const { yScale, orientation, barScale } = useChart()

  if (orientation !== "vertical" || !barScale) {
    return null
  }

  const ticks =
    typeof yScale.ticks === "function" ? yScale.ticks(numTicks) : []

  return (
    <g aria-hidden className="pointer-events-none">
      {ticks.map((t) => {
        const y = yScale(t) ?? 0
        return (
          <text
            key={String(t)}
            dominantBaseline="middle"
            fill="var(--chart-label, var(--color-zinc-500))"
            fontSize={11}
            textAnchor="end"
            x={-6}
            y={y}
          >
            {t}
          </text>
        )
      })}
    </g>
  )
}

BarVerticalValueAxis.displayName = "BarVerticalValueAxis"
