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
} from "drizzle-orm/pg-core"

export const mlTraining = pgSchema("ml_training")

export const mlTrainingHistoricalTickets = mlTraining.table(
  "historical_tickets",
  {
    ticketId: text("ticket_id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    perimeter: text("perimeter").notNull(),
    priority: text("priority").notNull(),
    status: text("status").notNull(),
    storeId: text("store_id").notNull(),
    storeName: text("store_name").notNull(),
    city: text("city").notNull(),
    region: text("region").notNull(),
    assignedTeam: text("assigned_team"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionTimeMinutes: integer("resolution_time_minutes"),
    slaBreached: boolean("sla_breached").notNull(),
    escalationRequired: boolean("escalation_required").notNull(),
    transferRequired: boolean("transfer_required").notNull(),
    incidentCategory: text("incident_category").notNull(),
    environmentType: text("environment_type").notNull(),
    ticketSource: text("ticket_source").notNull(),
    resolutionSummary: text("resolution_summary"),
    finalResolutionStatus: text("final_resolution_status").notNull(),
    split: text("split").notNull().default("train"),
    noiseLevel: text("noise_level").notNull().default("medium"),
    rawText: text("raw_text"),
    cleanedText: text("cleaned_text"),
    vectorizationText: text("vectorization_text"),
  },
  (t) => ({
    perimeterIdx: index("ml_training_tickets_perimeter").on(t.perimeter),
    priorityIdx: index("ml_training_tickets_priority").on(t.priority),
    splitIdx: index("ml_training_tickets_split").on(t.split),
    labelsIdx: index("ml_training_tickets_labels").on(
      t.escalationRequired,
      t.transferRequired,
      t.slaBreached,
    ),
  }),
)

export const mlTrainingHistoricalActions = mlTraining.table(
  "historical_actions",
  {
    actionId: serial("action_id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => mlTrainingHistoricalTickets.ticketId, { onDelete: "cascade" }),
    actionType: text("action_type").notNull(),
    previousStatus: text("previous_status"),
    newStatus: text("new_status").notNull(),
    assignedGroup: text("assigned_group"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    actionAuthor: text("action_author").notNull(),
  },
  (t) => ({
    ticketTimeIdx: index("ml_training_actions_ticket_time").on(t.ticketId, t.timestamp),
  }),
)

export const mlTrainingHistoricalResolutions = mlTraining.table(
  "historical_resolutions",
  {
    resolutionId: serial("resolution_id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => mlTrainingHistoricalTickets.ticketId, { onDelete: "cascade" }),
    resolutionSummary: text("resolution_summary"),
    resolutionCategory: text("resolution_category").notNull(),
    closureReason: text("closure_reason").notNull(),
    solvedByTeam: text("solved_by_team").notNull(),
    resolutionType: text("resolution_type").notNull(),
    fixDurationMinutes: integer("fix_duration_minutes").notNull(),
  },
  (t) => ({
    ticketIdx: index("ml_training_resolutions_ticket").on(t.ticketId),
    categoryIdx: index("ml_training_resolutions_category").on(t.resolutionCategory),
  }),
)

export const mlTrainingKmArticles = mlTraining.table(
  "km_articles",
  {
    kmId: serial("km_id").primaryKey(),
    title: text("title").notNull(),
    procedureSteps: text("procedure_steps").notNull(),
    perimeter: text("perimeter").notNull(),
    incidentCategory: text("incident_category").notNull(),
    keywords: text("keywords").notNull(),
    difficultyLevel: text("difficulty_level").notNull(),
    applicabilityScore: real("applicability_score").notNull(),
  },
  (t) => ({
    perimeterIdx: index("ml_training_km_perimeter").on(t.perimeter),
    categoryIdx: index("ml_training_km_category").on(t.incidentCategory),
  }),
)

export const mlTrainingModelPredictions = mlTraining.table(
  "model_predictions",
  {
    predictionId: serial("prediction_id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => mlTrainingHistoricalTickets.ticketId, { onDelete: "cascade" }),
    modelName: text("model_name").notNull(),
    predictionType: text("prediction_type").notNull(),
    predictedLabel: text("predicted_label").notNull(),
    confidenceScore: real("confidence_score").notNull(),
    actualLabel: text("actual_label").notNull(),
    correctPrediction: boolean("correct_prediction").notNull(),
    inferenceTimeMs: integer("inference_time_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketIdx: index("ml_training_predictions_ticket").on(t.ticketId),
    modelIdx: index("ml_training_predictions_model").on(t.modelName, t.predictionType),
  }),
)

export const mlTrainingDatasetMetadata = mlTraining.table("dataset_metadata", {
  id: serial("id").primaryKey(),
  datasetName: text("dataset_name").notNull().default("carepilot_historical_v1"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  totalTickets: integer("total_tickets").notNull(),
  noiseLevel: text("noise_level").notNull(),
  seed: integer("seed").notNull(),
  splitRatios: jsonb("split_ratios").$type<Record<string, number>>().notNull(),
  classDistributions: jsonb("class_distributions").$type<Record<string, unknown>>().notNull(),
  missingness: jsonb("missingness").$type<Record<string, unknown>>().notNull(),
  uniqueStores: integer("unique_stores").notNull(),
  uniqueCategories: integer("unique_categories").notNull(),
  validationStatus: text("validation_status").notNull(),
  validationWarnings: jsonb("validation_warnings").$type<string[]>().notNull().default([]),
})

export const mlTrainingDatasetExports = mlTraining.table(
  "dataset_exports",
  {
    id: serial("id").primaryKey(),
    exportType: text("export_type").notNull(),
    split: text("split").notNull(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => mlTrainingHistoricalTickets.ticketId, { onDelete: "cascade" }),
    textPayload: text("text_payload").notNull(),
    labelPayload: jsonb("label_payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    exportTypeIdx: index("ml_training_exports_type").on(t.exportType, t.split),
  }),
)
