"use client"

import { useChart } from "./chart-context"

export interface BarHorizontalValueAxisProps {
  /** Approximate tick count for the value (X) axis. Default 5 */
  numTicks?: number
}

/** Bottom value tick labels for horizontal {@link BarChart} (uses linear value scale). */
export function BarHorizontalValueAxis({
  numTicks = 5,
}: BarHorizontalValueAxisProps) {
  const { yScale, innerHeight, orientation, barScale } = useChart()

  if (orientation !== "horizontal" || !barScale) {
    return null
  }

  const ticks =
    typeof yScale.ticks === "function" ? yScale.ticks(numTicks) : []

  return (
    <g aria-hidden className="pointer-events-none">
      {ticks.map((t) => {
        const x = yScale(t) ?? 0
        return (
          <text
            key={String(t)}
            dominantBaseline="hanging"
            fill="var(--chart-label, var(--color-zinc-500))"
            fontSize={11}
            textAnchor="middle"
            x={x}
            y={innerHeight + 10}
          >
            {t}
          </text>
        )
      })}
    </g>
  )
}

BarHorizontalValueAxis.displayName = "BarHorizontalValueAxis"
