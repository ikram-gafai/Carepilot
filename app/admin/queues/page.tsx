import { AdminPageBody } from "@/components/admin/layout/admin-header"
import { AdminQueuesView } from "@/components/admin/views/admin-queues-view"
import { AdminUnavailable } from "@/components/admin/ui/admin-unavailable"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { adminQueueSupervision } from "@/lib/admin/queues"
import { loadAdminWorkspace } from "@/lib/admin-workspace-fetch"

export const dynamic = "force-dynamic"

export default async function AdminQueuesPage() {
  const workspace = await loadAdminWorkspace(() => adminQueueSupervision())

  return (
    <>
      {workspace.ok ? <CarepilotAutoRefresh intervalMs={60_000} /> : null}
      <AdminPageBody>
        {!workspace.ok ? (
          <AdminUnavailable reason={workspace.reason} />
        ) : (
          <AdminQueuesView data={workspace.data} />
        )}
      </AdminPageBody>
    </>
  )
}
