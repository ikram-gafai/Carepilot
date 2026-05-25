import { headers } from "next/headers"

import { routeErrorMessage } from "@/lib/api/http"

export async function getCarepilotOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"
  if (host) return `${proto}://${host}`
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    `http://127.0.0.1:${process.env.PORT ?? "3000"}`
  )
}

export async function carepilotFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const origin = await getCarepilotOrigin()
  const url = `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`

  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  })

  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } & T

  if (!res.ok) {
    throw new Error(json && typeof json === "object" && "error" in json && json.error
      ? String(json.error)
      : `CarePilot API ${res.status}: ${path}`)
  }

  return json as T
}

export async function carepilotFetchSafe<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = await carepilotFetch<T>(path, init)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: routeErrorMessage(e) }
  }
}
