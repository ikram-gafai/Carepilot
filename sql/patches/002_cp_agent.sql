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
