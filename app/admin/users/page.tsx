import { AdminHeader, AdminPageBody } from "@/components/admin/layout/admin-header"
import { AdminUsersView } from "@/components/admin/views/admin-users-view"
import { AdminUnavailable } from "@/components/admin/ui/admin-unavailable"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { adminWorkforceSupervision } from "@/lib/admin/workforce"
import { loadAdminWorkspace } from "@/lib/admin-workspace-fetch"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const workspace = await loadAdminWorkspace(() => adminWorkforceSupervision())

  return (
    <>
      {workspace.ok ? <CarepilotAutoRefresh intervalMs={60_000} /> : null}
      <AdminHeader title="Workforce" />
      <AdminPageBody>
        {!workspace.ok ? (
          <AdminUnavailable reason={workspace.reason} />
        ) : (
          <AdminUsersView data={workspace.data} />
        )}
      </AdminPageBody>
    </>
  )
}
