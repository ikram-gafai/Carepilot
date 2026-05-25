import { AdminDashboardToolbar } from "@/components/admin/layout/admin-dashboard-toolbar"
import { AdminHeader, AdminPageBody } from "@/components/admin/layout/admin-header"
import { AdminDashboardView } from "@/components/admin/views/admin-dashboard-view"
import { AdminUnavailable } from "@/components/admin/ui/admin-unavailable"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { adminDashboardBundle } from "@/lib/admin/dashboard"
import { loadAdminWorkspace } from "@/lib/admin-workspace-fetch"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const workspace = await loadAdminWorkspace(() => adminDashboardBundle())

  return (
    <>
      {workspace.ok ? <CarepilotAutoRefresh intervalMs={60_000} /> : null}
      <AdminHeader title="Dashboard">
        <AdminDashboardToolbar />
      </AdminHeader>
      <AdminPageBody>
        {!workspace.ok ? (
          <AdminUnavailable reason={workspace.reason} />
        ) : (
          <AdminDashboardView data={workspace.data} />
        )}
      </AdminPageBody>
    </>
  )
}
