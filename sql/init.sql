-- CAREPILOT initial DDL (PostgreSQL + pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS care_source;
CREATE SCHEMA IF NOT EXISTS carepilot;

-- --- care_source (simulator) ---
CREATE TABLE care_source.stores (
  id SERIAL PRIMARY KEY,
  store_code TEXT NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE care_source.cash_registers (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES care_source.stores (id) ON DELETE CASCADE,
  register_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  UNIQUE (store_id, register_code)
);

CREATE TABLE care_source.km_procedures (
  id SERIAL PRIMARY KEY,
  km_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  perimeter TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  steps TEXT NOT NULL DEFAULT '',
  prerequisites TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE care_source.tickets (
  id SERIAL PRIMARY KEY,
  care_ticket_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  perimeter TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'PORTAL',
  store_code TEXT,
  cash_register_code TEXT,
  category TEXT,
  error_message TEXT,
  final_action TEXT,
  final_reason TEXT,
  incident_category TEXT,
  escalation_required BOOLEAN,
  transfer_required BOOLEAN,
  target_perimeter TEXT,
  km_applicable TEXT,
  resolved_by_km BOOLEAN,
  missing_information_flag BOOLEAN,
  applied_km_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ
);

CREATE TABLE care_source.ticket_comments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES care_source.tickets (id) ON DELETE CASCADE,
  author_role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE care_source.ticket_actions (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES care_source.tickets (id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  result TEXT,
  performed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- carepilot (internal) ---
CREATE TABLE carepilot.tickets (
  id SERIAL PRIMARY KEY,
  source_ticket_id INTEGER NOT NULL UNIQUE REFERENCES care_source.tickets (id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  summary TEXT,
  perimeter TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  store_code TEXT,
  cash_register_code TEXT,
  category TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  agent_final_decision TEXT,
  agent_final_decision_at TIMESTAMPTZ,
  agent_final_decision_notes TEXT
);

CREATE TABLE carepilot.ticket_timeline_events (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES carepilot.tickets (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ticket_timeline_ticket_time ON carepilot.ticket_timeline_events (ticket_id, occurred_at);

CREATE TABLE carepilot.ticket_analysis (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES carepilot.tickets (id) ON DELETE CASCADE,
  extracted_entities JSONB NOT NULL DEFAULT '{}'::jsonb,
  missing_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  operational_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  detected_problem_type TEXT,
  detected_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_summary TEXT,
  confidence_score REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ticket_analysis_one_per_ticket ON carepilot.ticket_analysis (ticket_id);

CREATE TABLE carepilot.embeddings (
  id SERIAL PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  embedding vector(384) NOT NULL,
  model_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, model_name)
);

CREATE TABLE carepilot.similar_ticket_results (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES carepilot.tickets (id) ON DELETE CASCADE,
  similar_ticket_id INTEGER NOT NULL REFERENCES carepilot.tickets (id) ON DELETE CASCADE,
  similarity_score REAL NOT NULL,
  rank INTEGER NOT NULL,
  reference_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE carepilot.km_recommendations (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES carepilot.tickets (id) ON DELETE CASCADE,
  km_id INTEGER NOT NULL,
  score REAL NOT NULL,
  rank INTEGER NOT NULL,
  explanation TEXT,
  why_factors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE carepilot.decision_suggestions (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES carepilot.tickets (id) ON DELETE CASCADE,
  suggested_action TEXT NOT NULL,
  reason TEXT,
  why_factors JSONB DEFAULT '[]'::jsonb,
  blocking_rules JSONB DEFAULT '[]'::jsonb,
  confidence_score REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE carepilot.sync_logs (
  id SERIAL PRIMARY KEY,
  sync_started_at TIMESTAMPTZ NOT NULL,
  sync_finished_at TIMESTAMPTZ,
  tickets_imported INTEGER NOT NULL DEFAULT 0,
  tickets_updated INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT
);

CREATE TABLE carepilot.golden_test_cases (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES carepilot.tickets (id) ON DELETE CASCADE,
  expected_entities JSONB,
  expected_missing_fields JSONB,
  expected_similar_group TEXT,
  expected_km TEXT,
  expected_decision TEXT
);
