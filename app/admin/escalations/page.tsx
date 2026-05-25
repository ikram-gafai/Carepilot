import { AdminHeader, AdminPageBody } from "@/components/admin/layout/admin-header"
import { AdminEscalationsView } from "@/components/admin/views/admin-escalations-view"
import { AdminUnavailable } from "@/components/admin/ui/admin-unavailable"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { adminEscalations } from "@/lib/admin/escalations"
import { loadAdminWorkspace } from "@/lib/admin-workspace-fetch"

export const dynamic = "force-dynamic"

export default async function AdminEscalationsPage() {
  const workspace = await loadAdminWorkspace(() => adminEscalations())

  return (
    <>
      {workspace.ok ? <CarepilotAutoRefresh intervalMs={60_000} /> : null}
      <AdminHeader title="Escalations" />
      <AdminPageBody>
        {!workspace.ok ? (
          <AdminUnavailable reason={workspace.reason} />
        ) : (
          <AdminEscalationsView data={workspace.data} />
        )}
      </AdminPageBody>
    </>
  )
}
