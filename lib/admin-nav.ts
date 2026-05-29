import {
  ArrowUpRight,
  LayoutDashboard,
  Layers,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react"

export const ADMIN_NAV = {
  overview: [{ href: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard }],
  operations: [
    { href: "/admin/queues", label: "Files d'attente", icon: Layers },
    { href: "/admin/escalations", label: "Escalades", icon: ArrowUpRight },
  ],
  ai: [
    { href: "/admin/recommendations", label: "Recommandations", icon: Sparkles },
    { href: "/admin/feedback", label: "Retours", icon: MessageSquare },
  ],
  team: [{ href: "/admin/users", label: "Agents", icon: Users }],
} as const

export const ADMIN_ROLES = ["Admin", "Superviseur"] as const
