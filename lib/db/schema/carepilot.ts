import { customType } from "drizzle-orm/pg-core"
import {
  integer,
  jsonb,
  pgSchema,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { careSourceTickets } from "./care-source"

/** pgvector column — values passed as number[] in app code */
export const vector384 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(384)"
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`
  },
})

export const carepilot = pgSchema("carepilot")

export const carepilotTickets = carepilot.table("tickets", {
  id: serial("id").primaryKey(),
  sourceTicketId: integer("source_ticket_id")
    .notNull()
    .unique()
    .references(() => careSourceTickets.id, { onDelete: "cascade" }),
  rawText: text("raw_text").notNull(),
  summary: text("summary"),
  perimeter: text("perimeter").notNull(),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
  storeCode: text("store_code"),
  cashRegisterCode: text("cash_register_code"),
  category: text("category"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
  agentFinalDecision: text("agent_final_decision"),
  agentFinalDecisionAt: timestamp("agent_final_decision_at", { withTimezone: true }),
  agentFinalDecisionNotes: text("agent_final_decision_notes"),
})

export const ticketTimelineEvents = carepilot.table("ticket_timeline_events", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => carepilotTickets.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  summary: text("summary").notNull(),
  detail: text("detail"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
})

export const ticketAnalysis = carepilot.table(
  "ticket_analysis",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => carepilotTickets.id, { onDelete: "cascade" }),
    extractedEntities: jsonb("extracted_entities").$type<Record<string, unknown>>().notNull().default({}),
    missingFields: jsonb("missing_fields").$type<string[]>().notNull().default([]),
    operationalTags: jsonb("operational_tags").$type<string[]>().notNull().default([]),
    detectedProblemType: text("detected_problem_type"),
    detectedActions: jsonb("detected_actions").$type<string[]>().notNull().default([]),
    aiSummary: text("ai_summary"),
    confidenceScore: real("confidence_score"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ticket_analysis_one_per_ticket").on(t.ticketId)],
)

export const embeddings = carepilot.table(
  "embeddings",
  {
    id: serial("id").primaryKey(),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    embedding: vector384("embedding").notNull(),
    modelName: text("model_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("embeddings_source_model_unique").on(t.sourceType, t.sourceId, t.modelName),
  ],
)

export const similarTicketResults = carepilot.table("similar_ticket_results", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => carepilotTickets.id, { onDelete: "cascade" }),
  similarTicketId: integer("similar_ticket_id")
    .notNull()
    .references(() => carepilotTickets.id, { onDelete: "cascade" }),
  similarityScore: real("similarity_score").notNull(),
  rank: integer("rank").notNull(),
  referenceNote: text("reference_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const kmRecommendations = carepilot.table("km_recommendations", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => carepilotTickets.id, { onDelete: "cascade" }),
  kmId: integer("km_id").notNull(),
  score: real("score").notNull(),
  rank: integer("rank").notNull(),
  explanation: text("explanation"),
  whyFactors: jsonb("why_factors").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const decisionSuggestions = carepilot.table("decision_suggestions", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => carepilotTickets.id, { onDelete: "cascade" }),
  suggestedAction: text("suggested_action").notNull(),
  reason: text("reason"),
  whyFactors: jsonb("why_factors").$type<string[]>().default([]),
  blockingRules: jsonb("blocking_rules").$type<string[]>().default([]),
  confidenceScore: real("confidence_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const syncLogs = carepilot.table("sync_logs", {
  id: serial("id").primaryKey(),
  syncStartedAt: timestamp("sync_started_at", { withTimezone: true }).notNull(),
  syncFinishedAt: timestamp("sync_finished_at", { withTimezone: true }),
  ticketsImported: integer("tickets_imported").notNull().default(0),
  ticketsUpdated: integer("tickets_updated").notNull().default(0),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
})

export const goldenTestCases = carepilot.table("golden_test_cases", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => carepilotTickets.id, { onDelete: "cascade" }),
  expectedEntities: jsonb("expected_entities"),
  expectedMissingFields: jsonb("expected_missing_fields"),
  expectedSimilarGroup: text("expected_similar_group"),
  expectedKm: text("expected_km"),
  expectedDecision: text("expected_decision"),
})
