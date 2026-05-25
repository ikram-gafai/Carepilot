import {
  careCommentListSchema,
  careHistoryListSchema,
  careKmListSchema,
  careKmSchema,
  careTicketListSchema,
  careTicketSchema,
} from "./validators"
import type {
  CareKmReference,
  CareListResponse,
  CareTicket,
  CareTicketComment,
  CareTicketHistoryEvent,
} from "./types"

export class CareClientError extends Error {
  constructor(
    message: string,
    readonly code: "timeout" | "invalid_response" | "request_failed" | "not_found",
    readonly status?: number,
  ) {
    super(message)
    this.name = "CareClientError"
  }
}

const DEFAULT_TIMEOUT_MS = Number(process.env.CARE_API_TIMEOUT_MS ?? "30000")

function careApiBase(): string {
  const base =
    process.env.CARE_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    `http://127.0.0.1:${process.env.PORT ?? "3000"}`
  return base.replace(/\/$/, "")
}

async function careFetch<T>(
  path: string,
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: unknown } },
): Promise<T> {
  const url = `${careApiBase()}${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })

    if (res.status === 404) {
      throw new CareClientError(`CARE resource not found: ${path}`, "not_found", 404)
    }

    if (!res.ok) {
      throw new CareClientError(
        `CARE request failed (${res.status}): ${path}`,
        "request_failed",
        res.status,
      )
    }

    let json: unknown
    try {
      json = await res.json()
    } catch {
      throw new CareClientError(`Invalid JSON from CARE: ${path}`, "invalid_response")
    }

    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      throw new CareClientError(
        `CARE response validation failed: ${path}`,
        "invalid_response",
      )
    }

    return parsed.data as T
  } catch (e) {
    if (e instanceof CareClientError) throw e
    if (e instanceof Error && e.name === "AbortError") {
      throw new CareClientError(`CARE request timed out: ${path}`, "timeout")
    }
    throw new CareClientError(
      e instanceof Error ? e.message : String(e),
      "request_failed",
    )
  } finally {
    clearTimeout(timer)
  }
}

export function createCareClient() {
  return {
    async getTickets(opts?: {
      limit?: number
      offset?: number
    }): Promise<CareListResponse<CareTicket>> {
      const qs = new URLSearchParams()
      if (opts?.limit != null) qs.set("limit", String(opts.limit))
      if (opts?.offset != null) qs.set("offset", String(opts.offset))
      const q = qs.toString()
      return careFetch(`/api/care/tickets${q ? `?${q}` : ""}`, careTicketListSchema)
    },

    /** Fetches every CARE ticket page until `total` is reached. */
    async getAllTickets(): Promise<CareListResponse<CareTicket>> {
      const pageSize = Number(process.env.CARE_API_PAGE_SIZE ?? "100")
      const limit = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 500) : 100
      const items: CareTicket[] = []
      let offset = 0
      let total = 0

      for (;;) {
        const page = await careFetch(
          `/api/care/tickets?limit=${limit}&offset=${offset}`,
          careTicketListSchema,
        )
        if (offset === 0) total = page.total
        items.push(...page.items)
        offset += page.items.length
        if (page.items.length === 0 || items.length >= total) break
        if (offset > 50_000) break
      }

      return { items, total: Math.max(total, items.length) }
    },

    async getTicketById(id: string): Promise<CareTicket> {
      const data = await careFetch(`/api/care/tickets/${encodeURIComponent(id)}`, careTicketSchema)
      return data
    },

    async getTicketHistory(ticketId: string): Promise<CareListResponse<CareTicketHistoryEvent>> {
      return careFetch(
        `/api/care/tickets/${encodeURIComponent(ticketId)}/history`,
        careHistoryListSchema,
      )
    },

    async getTicketComments(ticketId: string): Promise<CareListResponse<CareTicketComment>> {
      return careFetch(
        `/api/care/tickets/${encodeURIComponent(ticketId)}/comments`,
        careCommentListSchema,
      )
    },

    async getKmList(): Promise<CareListResponse<CareKmReference>> {
      return careFetch("/api/care/km", careKmListSchema)
    },

    async getKmById(id: string): Promise<CareKmReference> {
      return careFetch(`/api/care/km/${encodeURIComponent(id)}`, careKmSchema)
    },
  }
}

export type CareClient = ReturnType<typeof createCareClient>
