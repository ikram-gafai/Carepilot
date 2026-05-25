import { NextResponse } from "next/server"
import type { z } from "zod"

/** Uniform JSON responses for route handlers (demo / API clients). */
export function apiOk<T extends Record<string, unknown>>(data: T & { ok?: never }) {
  return NextResponse.json({ ok: true as const, ...data })
}

export function apiFail(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false as const, error: message, ...extra }, { status })
}

export async function parseBody<S extends z.ZodType>(
  schema: S,
  req: Request,
): Promise<{ success: true; data: z.infer<S> } | { success: false; response: NextResponse }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return {
      success: false,
      response: apiFail(400, "Invalid or empty JSON body"),
    }
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    return {
      success: false,
      response: apiFail(400, issues || "Validation failed"),
    }
  }

  return { success: true, data: parsed.data }
}

export function routeErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
