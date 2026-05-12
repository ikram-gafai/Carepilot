import { AnalyticsOperationalOverview } from "@/components/analytics-operational-overview"
import { CarePilotSetHeader } from "@/components/carepilot-page-header"

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <CarePilotSetHeader title="Analytics" />
      <AnalyticsOperationalOverview />
    </div>
  )
}
