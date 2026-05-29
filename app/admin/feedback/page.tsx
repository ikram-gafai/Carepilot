import { AdminPageBody } from "@/components/admin/layout/admin-header"
import { AdminFeedbackView } from "@/components/admin/views/admin-feedback-view"
import { AdminUnavailable } from "@/components/admin/ui/admin-unavailable"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { adminFeedbackSupervision } from "@/lib/admin/feedback"
import { loadAdminWorkspace } from "@/lib/admin-workspace-fetch"

export const dynamic = "force-dynamic"

export default async function AdminFeedbackPage() {
  const workspace = await loadAdminWorkspace(() => adminFeedbackSupervision())

  return (
    <>
      {workspace.ok ? <CarepilotAutoRefresh intervalMs={60_000} /> : null}
      <AdminPageBody>
        {!workspace.ok ? (
          <AdminUnavailable reason={workspace.reason} />
        ) : (
          <AdminFeedbackView data={workspace.data} />
        )}
      </AdminPageBody>
    </>
  )
}
