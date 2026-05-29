-- CarePilot agent workspace (`cp_agent`): queue + ticket detail + dashboard.
-- Idempotent — safe to re-run. Matches `lib/db/schema/cp-agent.ts` / `sql/patches/002_cp_agent.sql`.
-- `/agent/tickets` uses `cp_agent.users` + `cp_agent.tickets` (left join).

CREATE SCHEMA IF NOT EXISTS cp_agent;

CREATE TABLE IF NOT EXISTS cp_agent.users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_agent.tickets (
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

CREATE INDEX IF NOT EXISTS cp_agent_tickets_status ON cp_agent.tickets (status);
CREATE INDEX IF NOT EXISTS cp_agent_tickets_priority ON cp_agent.tickets (priority);
CREATE INDEX IF NOT EXISTS cp_agent_tickets_sla ON cp_agent.tickets (sla_due_at);

CREATE TABLE IF NOT EXISTS cp_agent.ticket_history (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT,
  actor_label TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_agent_hist_ticket_time ON cp_agent.ticket_history (ticket_id, occurred_at DESC);

ALTER TABLE cp_agent.ticket_history ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE cp_agent.ticket_history ADD COLUMN IF NOT EXISTS previous_value TEXT;
ALTER TABLE cp_agent.ticket_history ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE cp_agent.ticket_history ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE cp_agent.ticket_history ADD COLUMN IF NOT EXISTS performed_by TEXT;
ALTER TABLE cp_agent.ticket_history ADD COLUMN IF NOT EXISTS performed_at TIMESTAMPTZ;
ALTER TABLE cp_agent.ticket_history ADD COLUMN IF NOT EXISTS external_created_at TIMESTAMPTZ;
ALTER TABLE cp_agent.ticket_history ADD COLUMN IF NOT EXISTS external_updated_at TIMESTAMPTZ;
ALTER TABLE cp_agent.ticket_history ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE cp_agent.ticket_history ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'CARE';
ALTER TABLE cp_agent.ticket_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_hist_external_id ON cp_agent.ticket_history (external_id);

CREATE TABLE IF NOT EXISTS cp_agent.ticket_comments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  external_id TEXT NOT NULL UNIQUE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal',
  external_created_at TIMESTAMPTZ NOT NULL,
  external_updated_at TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'CARE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_comments_external_id ON cp_agent.ticket_comments (external_id);

CREATE TABLE IF NOT EXISTS cp_agent.km_references (
  id SERIAL PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  perimeter TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  procedure_steps TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  external_created_at TIMESTAMPTZ NOT NULL,
  external_updated_at TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'CARE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_km_external_id ON cp_agent.km_references (external_id);
CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_km_code ON cp_agent.km_references (code);

CREATE TABLE IF NOT EXISTS cp_agent.ai_analyses (
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

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_ai_one_active ON cp_agent.ai_analyses (ticket_id);

CREATE TABLE IF NOT EXISTS cp_agent.km_suggestions (
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

CREATE INDEX IF NOT EXISTS cp_agent_km_ticket ON cp_agent.km_suggestions (ticket_id, rank);

CREATE TABLE IF NOT EXISTS cp_agent.ai_feedback (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  helpful BOOLEAN,
  confidence_rating INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_agent.sync_logs (
  id SERIAL PRIMARY KEY,
  sync_started_at TIMESTAMPTZ NOT NULL,
  sync_finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  message TEXT,
  records_processed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cp_agent.audit_logs (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES cp_agent.tickets (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_agent_audit_ticket ON cp_agent.audit_logs (ticket_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cp_agent.procedures (
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

CREATE INDEX IF NOT EXISTS cp_agent_procedures_category ON cp_agent.procedures (category);
CREATE INDEX IF NOT EXISTS cp_agent_procedures_scope ON cp_agent.procedures (scope);

CREATE TABLE IF NOT EXISTS cp_agent.ticket_procedure_links (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  procedure_id INTEGER NOT NULL REFERENCES cp_agent.procedures (id) ON DELETE CASCADE,
  relevance_score REAL NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_agent_ticket_proc_ticket ON cp_agent.ticket_procedure_links (ticket_id);
CREATE INDEX IF NOT EXISTS cp_agent_ticket_proc_procedure ON cp_agent.ticket_procedure_links (procedure_id);
