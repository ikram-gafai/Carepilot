"use server"



import { revalidatePath } from "next/cache"

import { eq } from "drizzle-orm"

import { z } from "zod"



import {

  historySummaryForAction,

  OPERATIONAL_ACTION_KINDS,

  ticketStatusForAction,

  type OperationalActionKind,

} from "@/lib/care-operational-actions"

import { getDb } from "@/lib/db"

import {

  cpAgentAuditLogs,

  cpAgentAiFeedback,

  cpAgentTicketHistory,

  cpAgentTickets,

} from "@/lib/db/schema/cp-agent"



const ticketActionSchema = z.object({

  ticketId: z.number().int().positive(),

  kind: z.enum(OPERATIONAL_ACTION_KINDS as [OperationalActionKind, ...OperationalActionKind[]]),

  note: z.string().max(4000).optional().nullable(),

})



const feedbackSchema = z.object({

  ticketId: z.number().int().positive(),

  helpful: z.enum(["yes", "no", "unset"]),

  confidenceRating: z.number().int().min(1).max(5).optional().nullable(),

  comment: z.string().max(4000).optional().nullable(),

})



export async function submitCpAgentTicketAction(input: unknown) {

  const parsed = ticketActionSchema.safeParse(input)

  if (!parsed.success) {

    return { ok: false as const, error: "Invalid input." }

  }

  const { ticketId, kind, note } = parsed.data

  const db = getDb()

  const nextStatus = ticketStatusForAction(kind)



  await db

    .update(cpAgentTickets)

    .set({ status: nextStatus, updatedAt: new Date() })

    .where(eq(cpAgentTickets.id, ticketId))



  await db.insert(cpAgentTicketHistory).values({

    ticketId,

    eventType: kind,

    summary: historySummaryForAction(kind),

    detail: note?.trim() || null,

    actorLabel: "Agent",

    occurredAt: new Date(),

  })



  await db.insert(cpAgentAuditLogs).values({

    ticketId,

    action: `ticket_${kind}`,

    payload: { note: note ?? null },

  })



  revalidatePath("/agent", "layout")

  revalidatePath("/agent/dashboard")

  revalidatePath("/agent/tickets")

  revalidatePath(`/agent/tickets/${ticketId}`)

  revalidatePath("/agent/actions")

  return { ok: true as const }

}



export async function submitCpAgentAiFeedback(input: unknown) {

  const parsed = feedbackSchema.safeParse(input)

  if (!parsed.success) {

    return { ok: false as const, error: "Invalid input." }

  }

  const { ticketId, helpful, confidenceRating, comment } = parsed.data

  const db = getDb()



  const helpfulBool =

    helpful === "yes" ? true : helpful === "no" ? false : null



  await db.insert(cpAgentAiFeedback).values({

    ticketId,

    helpful: helpfulBool,

    confidenceRating: confidenceRating ?? null,

    comment: comment?.trim() || null,

  })



  await db.insert(cpAgentAuditLogs).values({

    ticketId,

    action: "ai_feedback",

    payload: { helpful },

  })



  revalidatePath("/agent", "layout")

  revalidatePath(`/agent/tickets/${ticketId}`)

  revalidatePath("/agent/actions")

  return { ok: true as const }

}


