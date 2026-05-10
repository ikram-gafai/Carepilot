"use client"

import { useChart } from "./chart-context"

export interface LineDataPointsProps {
  dataKey: string
  /** Dot radius in px. Default 4 */
  r?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

/** Filled circles at each line sample (e.g. white fill + brand stroke). */
export function LineDataPoints({
  dataKey,
  r = 4,
  fill = "var(--background)",
  stroke = "var(--primary)",
  strokeWidth = 2,
}: LineDataPointsProps) {
  const { data, xScale, yScale, xAccessor } = useChart()

  return (
    <g aria-hidden className="line-data-points">
      {data.map((d, i) => {
        const v = d[dataKey]
        if (typeof v !== "number") {
          return null
        }
        const cx = xScale(xAccessor(d)) ?? 0
        const cy = yScale(v) ?? 0
        return (
          <circle
            key={`${i}-${String(cx)}`}
            cx={cx}
            cy={cy}
            fill={fill}
            r={r}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )
      })}
    </g>
  )
}

LineDataPoints.displayName = "LineDataPoints"
