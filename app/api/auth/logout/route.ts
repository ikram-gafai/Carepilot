import { apiOk } from "@/lib/api/http"
import { destroyCarePilotSession } from "@/lib/auth/session"
import { hasDatabaseUrl } from "@/lib/db"

export async function POST() {
  if (hasDatabaseUrl()) {
    await destroyCarePilotSession()
  }
  return apiOk({ cleared: true })
}
