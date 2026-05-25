-- CAREPILOT initial DDL (PostgreSQL + pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS care_source;
CREATE SCHEMA IF NOT EXISTS carepilot;

-- --- care_source (simulator) ---
CREATE TABLE care_source.stores (
  id SERIAL PRIMARY KEY,
  store_code TEXT NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  store_type TEXT NOT NULL DEFAULT 'Market'
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
  store_id INTEGER NOT NULL REFERENCES care_source.stores (id),
  store_code TEXT NOT NULL,
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

CREATE TABLE carepilot.users (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE carepilot.sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES carepilot.users (id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX carepilot_sessions_user_id_idx ON carepilot.sessions (user_id);

CREATE TABLE carepilot.user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES carepilot.users (id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark',
  compact_mode BOOLEAN NOT NULL DEFAULT false,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CarePilot agent workspace (operational data layer)
CREATE SCHEMA IF NOT EXISTS cp_agent;

CREATE TABLE cp_agent.users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cp_agent.tickets (
  id SERIAL PRIMARY KEY,
  care_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  store_code TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  sla_due_at TIMESTAMPTZ,
  ttr_target_hours INTEGER,
  assigned_user_id INTEGER REFERENCES cp_agent.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cp_agent_tickets_status ON cp_agent.tickets (status);
CREATE INDEX cp_agent_tickets_priority ON cp_agent.tickets (priority);
CREATE INDEX cp_agent_tickets_sla ON cp_agent.tickets (sla_due_at);

CREATE TABLE cp_agent.procedures (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  scope TEXT NOT NULL,
  summary TEXT NOT NULL,
  prerequisites TEXT NOT NULL DEFAULT '',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT NOT NULL DEFAULT '',
  relevance_score REAL NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cp_agent_procedures_category ON cp_agent.procedures (category);
CREATE INDEX cp_agent_procedures_scope ON cp_agent.procedures (scope);

CREATE TABLE cp_agent.ticket_procedure_links (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  procedure_id INTEGER NOT NULL REFERENCES cp_agent.procedures (id) ON DELETE CASCADE,
  relevance_score REAL NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cp_agent_ticket_proc_ticket ON cp_agent.ticket_procedure_links (ticket_id);
CREATE INDEX cp_agent_ticket_proc_procedure ON cp_agent.ticket_procedure_links (procedure_id);

CREATE TABLE cp_agent.ticket_history (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT,
  actor_label TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cp_agent_hist_ticket_time ON cp_agent.ticket_history (ticket_id, occurred_at DESC);

CREATE TABLE cp_agent.ai_analyses (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  detected_issue TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  confidence REAL NOT NULL,
  escalation_risk TEXT NOT NULL DEFAULT 'low',
  missing_info JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX cp_agent_ai_one_active ON cp_agent.ai_analyses (ticket_id);

CREATE TABLE cp_agent.km_suggestions (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  km_code TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  steps TEXT NOT NULL DEFAULT '',
  relevance_score REAL NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cp_agent_km_ticket ON cp_agent.km_suggestions (ticket_id, rank);

CREATE TABLE cp_agent.ai_feedback (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  helpful BOOLEAN,
  confidence_rating INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cp_agent.sync_logs (
  id SERIAL PRIMARY KEY,
  sync_started_at TIMESTAMPTZ NOT NULL,
  sync_finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  message TEXT,
  records_processed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE cp_agent.audit_logs (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES cp_agent.tickets (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cp_agent_audit_ticket ON cp_agent.audit_logs (ticket_id, created_at DESC);
