-- Admin supervision schema + cp_agent audit/sync extensions

CREATE SCHEMA IF NOT EXISTS cp_admin;

CREATE TABLE IF NOT EXISTS cp_admin.operational_signals (
  id SERIAL PRIMARY KEY,
  severity TEXT NOT NULL DEFAULT 'info',
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_admin_signals_detected ON cp_admin.operational_signals (detected_at DESC);
CREATE INDEX IF NOT EXISTS cp_admin_signals_category ON cp_admin.operational_signals (category);

CREATE TABLE IF NOT EXISTS cp_admin.system_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_admin_events_occurred ON cp_admin.system_events (occurred_at DESC);

ALTER TABLE cp_agent.sync_logs ADD COLUMN IF NOT EXISTS records_imported INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cp_agent.sync_logs ADD COLUMN IF NOT EXISTS records_updated INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cp_agent.sync_logs ADD COLUMN IF NOT EXISTS records_failed INTEGER NOT NULL DEFAULT 0;

ALTER TABLE cp_agent.audit_logs ADD COLUMN IF NOT EXISTS actor_label TEXT;
ALTER TABLE cp_agent.audit_logs ADD COLUMN IF NOT EXISTS target_label TEXT;
ALTER TABLE cp_agent.audit_logs ADD COLUMN IF NOT EXISTS detail TEXT;
