import { TicketPanelSkeleton } from "@/components/carepilot/page-loading-skeleton"

export default function AgentActionsLoading() {
  return (
    <div className="mx-auto max-w-[1280px] p-4">
      <TicketPanelSkeleton />
    </div>
  )
}
