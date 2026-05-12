import { CarePilotSetHeader } from "@/components/carepilot-page-header"
import { TicketsDemoQueueTable } from "@/components/tickets-demo-queue-table"
import {
  TicketsHeaderFilters,
  TicketsHeaderRefreshButton,
} from "@/components/tickets-header-filters"

export default function TicketsPage() {
  return (
    <div className="space-y-3">
      <CarePilotSetHeader
        title="Tickets FO VLP"
        actions={<TicketsHeaderFilters />}
        trailingActions={<TicketsHeaderRefreshButton />}
      />

      <TicketsDemoQueueTable />
    </div>
  )
}
