import {
  ArrowUpRight,
  LayoutDashboard,
  Layers,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react"

export const ADMIN_NAV = {
  overview: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  operations: [
    { href: "/admin/queues", label: "Queues", icon: Layers },
    { href: "/admin/escalations", label: "Escalations", icon: ArrowUpRight },
  ],
  ai: [
    { href: "/admin/recommendations", label: "Recommendations", icon: Sparkles },
    { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  ],
  team: [{ href: "/admin/users", label: "Agents", icon: Users }],
} as const

export const ADMIN_ROLES = ["Admin", "Supervisor"] as const
