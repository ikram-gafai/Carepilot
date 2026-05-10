import { apiFail } from "@/lib/api/http"
import { getDashboardMetrics } from "@/lib/queries/dashboard-metrics"

export async function GET() {
  try {
    const metrics = await getDashboardMetrics()
    return Response.json({ ok: true as const, ...metrics })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return apiFail(500, msg)
  }
}
