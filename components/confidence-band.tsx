import { Badge } from "@/components/ui/badge"
import { confidenceBandLabel, scoreToConfidenceBand } from "@/lib/confidence"

export function ConfidenceBandBadge({ score }: { score: number }) {
  const band = scoreToConfidenceBand(score)
  const variant =
    band === "high" ? "default" : band === "medium" ? "secondary" : "outline"

  return (
    <Badge variant={variant} className="text-[10px] font-medium uppercase tracking-wide">
      {confidenceBandLabel(band)}
    </Badge>
  )
}
