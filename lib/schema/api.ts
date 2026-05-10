import { z } from "zod"

export const ticketIdBodySchema = z.object({
  ticketId: z.number().int().positive(),
})

export const agentDecisionBodySchema = z.object({
  agentFinalDecision: z.string().min(1),
  notes: z.string().optional(),
})

export const syncCareSuccessSchema = z.object({
  ok: z.literal(true),
  imported: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  syncLogId: z.number().int().positive(),
  pendingRemaining: z.number().int().nonnegative(),
})

export const syncCareErrorSchema = z.object({
  ok: z.literal(false),
  imported: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  error: z.string(),
  pendingRemaining: z.number().nullable(),
})

export const syncCareResponseSchema = z.discriminatedUnion("ok", [
  syncCareSuccessSchema,
  syncCareErrorSchema,
])

export const ticketPipelineOkSchema = z.object({
  ok: z.literal(true),
})

export const apiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
})

export const dashboardMetricsSchema = z.object({
  backlog: z.number(),
  ticketsByStatus: z.record(z.string(), z.number()),
  slaAtRisk: z.number(),
  escalationRate: z.number(),
  transferRate: z.number(),
  missingInformationRate: z.number(),
  kmRecommendationCoverage: z.number(),
  lastSync: z
    .object({
      finishedAt: z.string().nullable(),
      status: z.string().nullable(),
      imported: z.number(),
      updated: z.number(),
      errorMessage: z.string().nullable(),
    })
    .nullable(),
})

export const benchmarkEvalReportSchema = z.object({
  note: z.string().optional(),
  counts: z.object({
    golden: z.number(),
    kmEvaluated: z.number().optional(),
    decisionEvaluated: z.number().optional(),
    similarEvaluated: z.number().optional(),
  }),
  metrics: z.record(z.string(), z.number()).optional(),
})
