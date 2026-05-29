-- ML training dataset schema.
-- Isolated from care_source / cp_agent so preprocessing and benchmarking cannot affect operations.

CREATE SCHEMA IF NOT EXISTS ml_training;

CREATE TABLE IF NOT EXISTS ml_training.historical_tickets (
  ticket_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  perimeter TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  store_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  assigned_team TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution_time_minutes INTEGER,
  sla_breached BOOLEAN NOT NULL,
  escalation_required BOOLEAN NOT NULL,
  transfer_required BOOLEAN NOT NULL,
  recommended_action TEXT NOT NULL,
  incident_category TEXT NOT NULL,
  environment_type TEXT NOT NULL,
  ticket_source TEXT NOT NULL,
  resolution_summary TEXT,
  final_resolution_status TEXT NOT NULL,
  split TEXT NOT NULL DEFAULT 'train',
  noise_level TEXT NOT NULL DEFAULT 'medium',
  raw_text TEXT,
  cleaned_text TEXT,
  vectorization_text TEXT
);

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS recommended_action TEXT;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS ticket_age_minutes INTEGER;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS queue_load REAL;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS store_size TEXT;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS operational_complexity REAL;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS expected_km_id TEXT;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS relevant_km_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS similar_case_group_id TEXT;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS incident_cluster TEXT;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS semantic_group TEXT;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS incident_family TEXT;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS root_cause_family TEXT;

ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS resolution_pattern TEXT;

CREATE INDEX IF NOT EXISTS ml_training_tickets_similar_group
  ON ml_training.historical_tickets (similar_case_group_id);

CREATE INDEX IF NOT EXISTS ml_training_tickets_semantic_group
  ON ml_training.historical_tickets (semantic_group);
CREATE INDEX IF NOT EXISTS ml_training_tickets_priority ON ml_training.historical_tickets (priority);
CREATE INDEX IF NOT EXISTS ml_training_tickets_split ON ml_training.historical_tickets (split);
CREATE INDEX IF NOT EXISTS ml_training_tickets_labels
  ON ml_training.historical_tickets (escalation_required, transfer_required, sla_breached);

CREATE INDEX IF NOT EXISTS ml_training_tickets_action
  ON ml_training.historical_tickets (recommended_action);

CREATE TABLE IF NOT EXISTS ml_training.historical_actions (
  action_id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES ml_training.historical_tickets (ticket_id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  assigned_group TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL,
  action_author TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ml_training_actions_ticket_time
  ON ml_training.historical_actions (ticket_id, "timestamp");

CREATE TABLE IF NOT EXISTS ml_training.historical_resolutions (
  resolution_id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES ml_training.historical_tickets (ticket_id) ON DELETE CASCADE,
  resolution_summary TEXT,
  resolution_category TEXT NOT NULL,
  closure_reason TEXT NOT NULL,
  solved_by_team TEXT NOT NULL,
  resolution_type TEXT NOT NULL,
  fix_duration_minutes INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ml_training_resolutions_ticket ON ml_training.historical_resolutions (ticket_id);
CREATE INDEX IF NOT EXISTS ml_training_resolutions_category ON ml_training.historical_resolutions (resolution_category);

CREATE TABLE IF NOT EXISTS ml_training.km_articles (
  km_id SERIAL PRIMARY KEY,
  km_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  procedure_steps TEXT NOT NULL,
  perimeter TEXT NOT NULL,
  incident_category TEXT NOT NULL,
  keywords TEXT NOT NULL,
  difficulty_level TEXT NOT NULL,
  applicability_score REAL NOT NULL
);

ALTER TABLE ml_training.km_articles
  ADD COLUMN IF NOT EXISTS km_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ml_training_km_code ON ml_training.km_articles (km_code);
CREATE INDEX IF NOT EXISTS ml_training_km_category ON ml_training.km_articles (incident_category);

CREATE TABLE IF NOT EXISTS ml_training.model_predictions (
  prediction_id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES ml_training.historical_tickets (ticket_id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  prediction_type TEXT NOT NULL,
  predicted_label TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  actual_label TEXT NOT NULL,
  correct_prediction BOOLEAN NOT NULL,
  inference_time_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ml_training_predictions_ticket ON ml_training.model_predictions (ticket_id);
CREATE INDEX IF NOT EXISTS ml_training_predictions_model
  ON ml_training.model_predictions (model_name, prediction_type);

CREATE TABLE IF NOT EXISTS ml_training.dataset_metadata (
  id SERIAL PRIMARY KEY,
  dataset_name TEXT NOT NULL DEFAULT 'carepilot_historical_v1',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_tickets INTEGER NOT NULL,
  noise_level TEXT NOT NULL,
  seed INTEGER NOT NULL,
  split_ratios JSONB NOT NULL,
  class_distributions JSONB NOT NULL,
  missingness JSONB NOT NULL,
  unique_stores INTEGER NOT NULL,
  unique_categories INTEGER NOT NULL,
  validation_status TEXT NOT NULL,
  validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS ml_training.dataset_exports (
  id SERIAL PRIMARY KEY,
  export_type TEXT NOT NULL,
  split TEXT NOT NULL,
  ticket_id TEXT NOT NULL REFERENCES ml_training.historical_tickets (ticket_id) ON DELETE CASCADE,
  text_payload TEXT NOT NULL,
  label_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ml_training_exports_type ON ml_training.dataset_exports (export_type, split);
