import { ADMIN_PAGE_DESCRIPTIONS } from "@/lib/operational-ui-copy"

export type AdminPageMeta = {
  title: string
  description?: string
}

export const ADMIN_PAGE_META: Record<string, AdminPageMeta> = {
  "/admin/dashboard": {
    title: "Tableau de bord",
    description: ADMIN_PAGE_DESCRIPTIONS.dashboard,
  },
  "/admin/queues": {
    title: "Files d'attente",
    description: ADMIN_PAGE_DESCRIPTIONS.queues,
  },
  "/admin/escalations": {
    title: "Escalades",
    description: ADMIN_PAGE_DESCRIPTIONS.escalations,
  },
  "/admin/recommendations": {
    title: "Recommandations",
    description: ADMIN_PAGE_DESCRIPTIONS.recommendations,
  },
  "/admin/feedback": {
    title: "Retours",
    description: ADMIN_PAGE_DESCRIPTIONS.feedback,
  },
  "/admin/users": {
    title: "Agents",
    description: ADMIN_PAGE_DESCRIPTIONS.users,
  },
}

export function getAdminPageMeta(pathname: string): AdminPageMeta | null {
  return ADMIN_PAGE_META[pathname] ?? null
}
