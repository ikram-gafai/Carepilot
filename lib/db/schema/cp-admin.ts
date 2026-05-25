import { index, integer, pgSchema, real, serial, text, timestamp } from "drizzle-orm/pg-core"

import { cpAgentSyncLogs, cpAgentTickets } from "@/lib/db/schema/cp-agent"

/** Admin supervision layer — signals, events, governance snapshots. */
export const cpAdmin = pgSchema("cp_admin")

export const cpAdminOperationalSignals = cpAdmin.table(
  "operational_signals",
  {
    id: serial("id").primaryKey(),
    severity: text("severity").notNull().default("info"),
    category: text("category").notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    detectedIdx: index("cp_admin_signals_detected").on(t.detectedAt),
    categoryIdx: index("cp_admin_signals_category").on(t.category),
  }),
)

export const cpAdminSystemEvents = cpAdmin.table(
  "system_events",
  {
    id: serial("id").primaryKey(),
    eventType: text("event_type").notNull(),
    summary: text("summary").notNull(),
    detail: text("detail"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    occurredIdx: index("cp_admin_events_occurred").on(t.occurredAt),
  }),
)

export const cpAdminOperationalQueues = cpAdmin.table(
  "operational_queues",
  {
    id: serial("id").primaryKey(),
    queueKey: text("queue_key").notNull().unique(),
    displayName: text("display_name").notNull(),
    category: text("category").notNull(),
    targetHandlingHours: integer("target_handling_hours").notNull().default(12),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    categoryIdx: index("cp_admin_queues_category").on(t.category),
  }),
)

export const cpAdminEscalationRecords = cpAdmin.table(
  "escalation_records",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => cpAgentTickets.id, { onDelete: "cascade" }),
    careId: text("care_id").notNull(),
    escalationRoute: text("escalation_route").notNull(),
    escalationReason: text("escalation_reason").notNull(),
    escalationStatus: text("escalation_status").notNull(),
    slaExposureLabel: text("sla_exposure_label").notNull(),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => ({
    ticketIdx: index("cp_admin_escalation_ticket").on(t.ticketId),
    statusIdx: index("cp_admin_escalation_status").on(t.escalationStatus),
  }),
)

export const cpAdminRecommendationMetrics = cpAdmin.table(
  "recommendation_metrics",
  {
    id: serial("id").primaryKey(),
    metricType: text("metric_type").notNull(),
    label: text("label").notNull(),
    detail: text("detail"),
    category: text("category"),
    acceptanceRate: real("acceptance_rate"),
    rejectionRate: real("rejection_rate"),
    avgConfidence: real("avg_confidence"),
    occurrenceCount: integer("occurrence_count").notNull().default(0),
    careId: text("care_id"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    typeIdx: index("cp_admin_rec_metrics_type").on(t.metricType),
  }),
)

export const cpAdminSyncIssues = cpAdmin.table(
  "sync_issues",
  {
    id: serial("id").primaryKey(),
    syncLogId: integer("sync_log_id").references(() => cpAgentSyncLogs.id, { onDelete: "set null" }),
    summary: text("summary").notNull(),
    detail: text("detail"),
    severity: text("severity").notNull().default("warning"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    occurredIdx: index("cp_admin_sync_issues_occurred").on(t.occurredAt),
  }),
)

export const cpAdminSourceHealth = cpAdmin.table("source_health", {
  id: serial("id").primaryKey(),
  sourceKey: text("source_key").notNull().unique(),
  label: text("label").notNull(),
  state: text("state").notNull().default("healthy"),
  detail: text("detail"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
})

export const cpAdminFeedbackSignals = cpAdmin.table(
  "feedback_signals",
  {
    id: serial("id").primaryKey(),
    careId: text("care_id"),
    summary: text("summary").notNull(),
    detail: text("detail"),
    severity: text("severity").notNull().default("info"),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    detectedIdx: index("cp_admin_feedback_signals_detected").on(t.detectedAt),
  }),
)
