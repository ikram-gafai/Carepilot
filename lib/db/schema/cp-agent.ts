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

export const cpAgentAiEscalationPredictions = cpAgent.table(
  "ai_escalation_predictions",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    modelName: text("model_name").notNull(),
    predictedEscalationRequired: boolean("predicted_escalation_required").notNull(),
    confidenceScore: real("confidence_score").notNull(),
    probabilityScore: real("probability_score").notNull(),
    predictionLabel: text("prediction_label").notNull(),
    modelVersion: text("model_version").notNull(),
    topFeatures: jsonb("top_features").$type<Record<string, unknown> | null>(),
    explanation: jsonb("explanation").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketUnique: uniqueIndex("cp_agent_ai_esc_pred_ticket").on(t.ticketId),
    modelVersionIdx: index("cp_agent_ai_esc_pred_version").on(t.modelVersion),
    escalationIdx: index("cp_agent_ai_esc_pred_escalation").on(
      t.predictedEscalationRequired,
      t.createdAt,
    ),
  }),
)

export const cpAgentAiTransferPredictions = cpAgent.table(
  "ai_transfer_predictions",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    modelName: text("model_name").notNull(),
    predictedTransferRequired: boolean("predicted_transfer_required").notNull(),
    confidenceScore: real("confidence_score").notNull(),
    probabilityScore: real("probability_score").notNull(),
    predictionLabel: text("prediction_label").notNull(),
    modelVersion: text("model_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketUnique: uniqueIndex("cp_agent_ai_transfer_pred_ticket").on(t.ticketId),
    modelVersionIdx: index("cp_agent_ai_transfer_pred_version").on(t.modelVersion),
    transferIdx: index("cp_agent_ai_transfer_pred_transfer").on(
      t.predictedTransferRequired,
      t.createdAt,
    ),
  }),
)

export const cpAgentAiActionRecommendations = cpAgent.table(
  "ai_action_recommendations",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    modelName: text("model_name").notNull(),
    recommendedAction: text("recommended_action").notNull(),
    confidenceScore: real("confidence_score").notNull(),
    probabilityDistribution: jsonb("probability_distribution")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    modelVersion: text("model_version").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketUnique: uniqueIndex("cp_agent_ai_action_rec_ticket").on(t.ticketId),
    actionIdx: index("cp_agent_ai_action_rec_action").on(t.recommendedAction, t.createdAt),
    modelVersionIdx: index("cp_agent_ai_action_rec_version").on(t.modelVersion),
  }),
)

export const cpAgentAiSlaPredictions = cpAgent.table(
  "ai_sla_predictions",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    modelName: text("model_name").notNull(),
    predictedSlaBreach: boolean("predicted_sla_breach").notNull(),
    probabilityScore: real("probability_score").notNull(),
    confidenceScore: real("confidence_score").notNull(),
    riskLevel: text("risk_level").notNull(),
    modelVersion: text("model_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketUnique: uniqueIndex("cp_agent_ai_sla_pred_ticket").on(t.ticketId),
    riskIdx: index("cp_agent_ai_sla_pred_risk").on(t.predictedSlaBreach, t.riskLevel, t.createdAt),
    modelVersionIdx: index("cp_agent_ai_sla_pred_version").on(t.modelVersion),
  }),
)

export const cpAgentAiPriorityPredictions = cpAgent.table(
  "ai_priority_predictions",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    modelName: text("model_name").notNull(),
    predictedPriority: text("predicted_priority").notNull(),
    confidenceScore: real("confidence_score").notNull(),
    probabilityDistribution: jsonb("probability_distribution")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    modelVersion: text("model_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketUnique: uniqueIndex("cp_agent_ai_priority_pred_ticket").on(t.ticketId),
    priorityIdx: index("cp_agent_ai_priority_pred_priority").on(t.predictedPriority, t.createdAt),
    modelVersionIdx: index("cp_agent_ai_priority_pred_version").on(t.modelVersion),
  }),
)

export const cpAgentAiKmRecommendations = cpAgent.table(
  "ai_km_recommendations",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    kmId: text("km_id").notNull(),
    kmTitle: text("km_title").notNull(),
    methodName: text("method_name").notNull(),
    similarityScore: real("similarity_score").notNull(),
    rank: integer("rank").notNull(),
    confidenceLevel: text("confidence_level").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketRankIdx: index("cp_agent_ai_km_rec_ticket").on(t.ticketId, t.rank),
    methodIdx: index("cp_agent_ai_km_rec_method").on(t.methodName, t.createdAt),
    ticketRankUnique: uniqueIndex("cp_agent_ai_km_rec_ticket_rank").on(t.ticketId, t.rank),
  }),
)

export const cpAgentAiSimilarTicketResults = cpAgent.table(
  "ai_similar_ticket_results",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    similarTicketId: integer("similar_ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    similarityScore: real("similarity_score").notNull(),
    retrievalMethod: text("retrieval_method").notNull(),
    rankPosition: integer("rank_position").notNull(),
    linkedResolution: text("linked_resolution"),
    linkedAction: text("linked_action"),
    linkedKmId: text("linked_km_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketRankIdx: index("cp_agent_ai_similar_ticket_ticket").on(t.ticketId, t.rankPosition),
    methodIdx: index("cp_agent_ai_similar_ticket_method").on(t.retrievalMethod, t.createdAt),
    ticketRankUnique: uniqueIndex("cp_agent_ai_similar_ticket_ticket_rank").on(t.ticketId, t.rankPosition),
  }),
)

export const cpAgentAiMissingInformationAnalysis = cpAgent.table(
  "ai_missing_information_analysis",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    missingFields: jsonb("missing_fields").$type<string[]>().notNull().default([]),
    completenessScore: real("completeness_score").notNull(),
    qualityLevel: text("quality_level").notNull(),
    confidenceScore: real("confidence_score").notNull(),
    detectionMethod: text("detection_method").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketUnique: uniqueIndex("cp_agent_ai_missing_info_ticket").on(t.ticketId),
    qualityIdx: index("cp_agent_ai_missing_info_quality").on(t.qualityLevel, t.createdAt),
    methodIdx: index("cp_agent_ai_missing_info_method").on(t.detectionMethod, t.createdAt),
  }),
)

export const cpAgentAiOperationalExplanations = cpAgent.table(
  "ai_operational_explanations",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    modelName: text("model_name").notNull(),
    operationalSummary: text("operational_summary").notNull(),
    recommendedActionExplanation: text("recommended_action_explanation").notNull(),
    reasoning: text("reasoning").notNull(),
    missingInformationNote: text("missing_information_note").notNull().default(""),
    nextSteps: text("next_steps").notNull(),
    latencyMs: integer("latency_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketUnique: uniqueIndex("cp_agent_ai_operational_explanations_ticket").on(t.ticketId),
    modelIdx: index("cp_agent_ai_operational_explanations_model").on(t.modelName, t.createdAt),
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
