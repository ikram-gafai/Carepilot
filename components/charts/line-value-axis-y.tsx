"use client"

import { useChart } from "./chart-context"

export interface LineValueAxisYProps {
  numTicks?: number
  /** Explicit tick values (e.g. `[0,1,2,3,4]` for integer counts). Must lie within the Y scale domain. */
  tickValues?: number[]
}

/** Left-side numeric ticks for line/area time–value charts (no bar scale). */
export function LineValueAxisY({
  numTicks = 5,
  tickValues: tickValuesProp,
}: LineValueAxisYProps) {
  const { yScale, barScale, orientation } = useChart()

  if (barScale != null || orientation === "horizontal") {
    return null
  }

  const ticks =
    tickValuesProp?.length != null && tickValuesProp.length > 0
      ? tickValuesProp
      : typeof yScale.ticks === "function"
        ? yScale.ticks(numTicks)
        : []

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

LineValueAxisY.displayName = "LineValueAxisY"
