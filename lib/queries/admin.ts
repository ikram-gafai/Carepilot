/** Admin supervision queries — re-exported from domain modules. */
export type { AdminHealth } from "@/lib/admin/shared"
export type { AdminKpiStatus } from "@/lib/admin/dashboard"

export { adminDashboardBundle } from "@/lib/admin/dashboard"
export { adminOperationalPressure } from "@/lib/admin/dashboard-pressure"

export { adminQueueSupervision } from "@/lib/admin/queues"

export { adminEscalations } from "@/lib/admin/escalations"

export { adminLatestSync } from "@/lib/admin/sync"

export { adminRecommendations } from "@/lib/admin/recommendations"

export { adminFeedbackSupervision } from "@/lib/admin/feedback"
export { adminWorkforceSupervision, adminUsers } from "@/lib/admin/workforce"
