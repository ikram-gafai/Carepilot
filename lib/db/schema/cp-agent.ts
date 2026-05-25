import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const cpAgent = pgSchema("cp_agent")

export const cpAgentUsers = cpAgent.table("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const cpAgentTickets = cpAgent.table(
  "tickets",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").unique(),
    careId: text("care_id").notNull().unique(),
    reference: text("reference"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    perimeter: text("perimeter"),
    storeId: integer("store_id"),
    storeCode: text("store_code"),
    storeName: text("store_name"),
    storeCity: text("store_city"),
    storeRegion: text("store_region"),
    storeType: text("store_type"),
    category: text("category").notNull(),
    subCategory: text("sub_category"),
    status: text("status").notNull(),
    priority: text("priority").notNull(),
    assignedGroup: text("assigned_group"),
    assignedAgent: text("assigned_agent"),
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }),
    resolutionDate: timestamp("resolution_date", { withTimezone: true }),
    ttrTargetHours: integer("ttr_target_hours"),
    assignedUserId: integer("assigned_user_id").references(() => cpAgentUsers.id),
    externalCreatedAt: timestamp("external_created_at", { withTimezone: true }),
    externalUpdatedAt: timestamp("external_updated_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    source: text("source").default("CARE"),
    aiRecommendedAction: text("ai_recommended_action"),
    aiConfidence: real("ai_confidence"),
    aiReason: text("ai_reason"),
    aiStatus: text("ai_status"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("cp_agent_tickets_status").on(t.status),
    priorityIdx: index("cp_agent_tickets_priority").on(t.priority),
    slaIdx: index("cp_agent_tickets_sla").on(t.slaDueAt),
    externalIdx: uniqueIndex("cp_agent_tickets_external_id").on(t.externalId),
  }),
)

/** Operational procedures (telemetry for agent Runbooks page). */
export const cpAgentProcedures = cpAgent.table(
  "procedures",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    scope: text("scope").notNull(),
    summary: text("summary").notNull(),
    prerequisites: text("prerequisites").notNull().default(""),
    steps: jsonb("steps").$type<string[]>().notNull().default([]),
    tags: text("tags").notNull().default(""),
    relevanceScore: real("relevance_score").notNull(),
    usageCount: integer("usage_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    categoryIdx: index("cp_agent_procedures_category").on(t.category),
    scopeIdx: index("cp_agent_procedures_scope").on(t.scope),
  }),
)

/** Links tickets to procedures (usage / relevance telemetry). */
export const cpAgentTicketProcedureLinks = cpAgent.table(
  "ticket_procedure_links",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    procedureId: integer("procedure_id")
      .notNull()
      .references(() => cpAgentProcedures.id, { onDelete: "cascade" }),
    relevanceScore: real("relevance_score").notNull(),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketIdx: index("cp_agent_ticket_proc_ticket").on(t.ticketId),
    procedureIdx: index("cp_agent_ticket_proc_procedure").on(t.procedureId),
  }),
)

export const cpAgentTicketHistory = cpAgent.table(
  "ticket_history",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    externalId: text("external_id").unique(),
    eventType: text("event_type").notNull(),
    previousValue: text("previous_value"),
    newValue: text("new_value"),
    description: text("description"),
    performedBy: text("performed_by"),
    performedAt: timestamp("performed_at", { withTimezone: true }),
    summary: text("summary").notNull(),
    detail: text("detail"),
    actorLabel: text("actor_label").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    externalCreatedAt: timestamp("external_created_at", { withTimezone: true }),
    externalUpdatedAt: timestamp("external_updated_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    source: text("source").default("CARE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketTimeIdx: index("cp_agent_hist_ticket_time").on(t.ticketId, t.occurredAt),
    externalIdx: uniqueIndex("cp_agent_hist_external_id").on(t.externalId),
  }),
)

export const cpAgentTicketComments = cpAgent.table(
  "ticket_comments",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull().unique(),
    authorName: text("author_name").notNull(),
    authorRole: text("author_role").notNull(),
    body: text("body").notNull(),
    visibility: text("visibility").notNull().default("internal"),
    externalCreatedAt: timestamp("external_created_at", { withTimezone: true }).notNull(),
    externalUpdatedAt: timestamp("external_updated_at", { withTimezone: true }).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull().default("CARE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    externalIdx: uniqueIndex("cp_agent_comments_external_id").on(t.externalId),
  }),
)

export const cpAgentKmReferences = cpAgent.table(
  "km_references",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").notNull().unique(),
    code: text("code").notNull().unique(),
    title: text("title").notNull(),
    perimeter: text("perimeter").notNull(),
    category: text("category").notNull(),
    keywords: text("keywords").notNull().default(""),
    summary: text("summary").notNull(),
    procedureSteps: text("procedure_steps").notNull().default("[]"),
    status: text("status").notNull().default("active"),
    externalCreatedAt: timestamp("external_created_at", { withTimezone: true }).notNull(),
    externalUpdatedAt: timestamp("external_updated_at", { withTimezone: true }).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull().default("CARE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    externalIdx: uniqueIndex("cp_agent_km_external_id").on(t.externalId),
    codeIdx: uniqueIndex("cp_agent_km_code").on(t.code),
  }),
)

export const cpAgentAiAnalyses = cpAgent.table(
  "ai_analyses",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    detectedIssue: text("detected_issue").notNull(),
    /** Canonical labels: Resolve, Suspend, Escalate N3, Transfer {Payment|Hardware|Back office|Network|Workstation|Infrastructure}. */
    suggestedAction: text("suggested_action").notNull(),
    confidence: real("confidence").notNull(),
    escalationRisk: text("escalation_risk").notNull().default("low"),
    missingInfo: jsonb("missing_info").$type<string[]>().notNull().default([]),
    reasoning: text("reasoning").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    onePerTicket: uniqueIndex("cp_agent_ai_one_active").on(t.ticketId),
  }),
)

export const cpAgentKmSuggestions = cpAgent.table(
  "km_suggestions",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    kmCode: text("km_code").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    steps: text("steps").notNull().default(""),
    relevanceScore: real("relevance_score").notNull(),
    rank: integer("rank").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketRankIdx: index("cp_agent_km_ticket").on(t.ticketId, t.rank),
  }),
)

export const cpAgentAiFeedback = cpAgent.table("ai_feedback", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
  helpful: boolean("helpful"),
  confidenceRating: integer("confidence_rating"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const cpAgentSyncSettings = cpAgent.table("sync_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const cpAgentSyncLogs = cpAgent.table("sync_logs", {
  id: serial("id").primaryKey(),
  syncType: text("sync_type").default("full"),
  syncStartedAt: timestamp("sync_started_at", { withTimezone: true }).notNull(),
  syncFinishedAt: timestamp("sync_finished_at", { withTimezone: true }),
  status: text("status").notNull(),
  message: text("message"),
  durationMs: integer("duration_ms"),
  insertedCount: integer("inserted_count").default(0),
  updatedCount: integer("updated_count").default(0),
  skippedCount: integer("skipped_count").default(0),
  failedCount: integer("failed_count").default(0),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsImported: integer("records_imported").notNull().default(0),
  recordsUpdated: integer("records_updated").notNull().default(0),
  recordsFailed: integer("records_failed").notNull().default(0),
})

export const cpAgentAuditLogs = cpAgent.table(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id").references(() => cpAgentTickets.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    actorId: integer("actor_id"),
    actorRole: text("actor_role"),
    actorLabel: text("actor_label"),
    targetLabel: text("target_label"),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    description: text("description"),
    detail: text("detail"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketTimeIdx: index("cp_agent_audit_ticket").on(t.ticketId, t.createdAt),
  }),
)
