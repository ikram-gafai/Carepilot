import { redirect } from "next/navigation"

import { CarePilotShell } from "@/components/carepilot-shell"
import { getCarePilotSession } from "@/lib/auth/session"
import { hasDatabaseUrl } from "@/lib/db"

export default async function CarePilotLayout({ children }: { children: React.ReactNode }) {
  if (hasDatabaseUrl()) {
    const session = await getCarePilotSession()
    if (!session) {
      redirect("/login")
    }
    return <CarePilotShell sessionUser={session}>{children}</CarePilotShell>
  }

  return <CarePilotShell>{children}</CarePilotShell>
}
