import { AdminHeader, AdminPageBody } from "@/components/admin/layout/admin-header"
import { AdminRecommendationsView } from "@/components/admin/views/admin-recommendations-view"
import { AdminUnavailable } from "@/components/admin/ui/admin-unavailable"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { adminRecommendations } from "@/lib/admin/recommendations"
import { loadAdminWorkspace } from "@/lib/admin-workspace-fetch"

export const dynamic = "force-dynamic"

export default async function AdminRecommendationsPage() {
  const workspace = await loadAdminWorkspace(() => adminRecommendations())

  return (
    <>
      {workspace.ok ? <CarepilotAutoRefresh intervalMs={60_000} /> : null}
      <AdminHeader title="Recommendations" />
      <AdminPageBody>
        {!workspace.ok ? (
          <AdminUnavailable reason={workspace.reason} />
        ) : (
          <AdminRecommendationsView data={workspace.data} />
        )}
      </AdminPageBody>
    </>
  )
}
