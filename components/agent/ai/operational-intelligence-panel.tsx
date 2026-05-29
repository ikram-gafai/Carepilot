import { OperationalIntelligenceWorkflowPanel } from "@/components/agent/ai/operational-intelligence-workflow-panel"
import type { OperationalIntelligencePayload } from "@/lib/ai/orchestration/types"

/** Unified operational intelligence sidebar for ticket investigation. */
export function OperationalIntelligencePanel({
  ticketId,
  intelligence,
  canRunPrediction = false,
}: {
  ticketId: number
  intelligence: OperationalIntelligencePayload
  canRunPrediction?: boolean
}) {
  return (
    <OperationalIntelligenceWorkflowPanel
      ticketId={ticketId}
      intelligence={intelligence}
      canRunAi={canRunPrediction}
    />
  )
}
