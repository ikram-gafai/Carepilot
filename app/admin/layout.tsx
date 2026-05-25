import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AdminShellWithPath } from "@/components/admin/layout/admin-shell-with-path"
import { ADMIN_ROLES } from "@/lib/admin-nav"
import { getCarePilotSession } from "@/lib/auth/session"
import { hasDatabaseUrl } from "@/lib/db"

export const metadata: Metadata = {
  title: { template: "%s · CAREPILOT Admin", default: "CAREPILOT Admin" },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (hasDatabaseUrl()) {
    const session = await getCarePilotSession()
    if (!session) {
      redirect("/login?from=/admin/dashboard")
    }
    if (!ADMIN_ROLES.includes(session.role as (typeof ADMIN_ROLES)[number])) {
      redirect("/agent/dashboard")
    }
    return (
      <div className="light min-h-dvh bg-zinc-50 text-zinc-900" style={{ colorScheme: "light" }}>
        <AdminShellWithPath sessionUser={session}>{children}</AdminShellWithPath>
      </div>
    )
  }

  return (
    <div className="light min-h-dvh bg-zinc-50 text-zinc-900" style={{ colorScheme: "light" }}>
      <AdminShellWithPath>{children}</AdminShellWithPath>
    </div>
  )
}
