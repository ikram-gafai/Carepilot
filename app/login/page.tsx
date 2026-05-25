import { Suspense } from "react"
import { redirect } from "next/navigation"

import { CarePilotLoginForm } from "@/components/carepilot-login-form"
import { getCarePilotSession } from "@/lib/auth/session"
import { hasDatabaseUrl } from "@/lib/db"

export const dynamic = "force-dynamic"

function resolveAfterLogin(from: string | string[] | undefined) {
  const raw = Array.isArray(from) ? from[0] : from
  if (typeof raw === "string" && raw.startsWith("/")) return raw
  return "/agent/dashboard"
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const afterLogin = resolveAfterLogin(sp.from)

  if (hasDatabaseUrl()) {
    const session = await getCarePilotSession()
    if (session) redirect(afterLogin)
  }

  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12"
      style={{
        backgroundImage: `
            linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)
          `,
        backgroundSize: "48px 48px",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-zinc-50/95" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-[400px]">
        <Suspense
          fallback={
            <div className="h-[420px] w-full animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100/80" />
          }
        >
          <CarePilotLoginForm />
        </Suspense>
      </div>
    </div>
  )
}
