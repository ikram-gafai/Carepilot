-- MVP CARE synchronization columns and tables (cp_agent)

ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS perimeter TEXT;
ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS assigned_group TEXT;
ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS assigned_agent TEXT;
ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS resolution_date TIMESTAMPTZ;
ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS external_created_at TIMESTAMPTZ;
ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS external_updated_at TIMESTAMPTZ;
ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE cp_agent.tickets ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'CARE';

UPDATE cp_agent.tickets SET external_id = care_id WHERE external_id IS NULL;
UPDATE cp_agent.tickets SET reference = care_id WHERE reference IS NULL;
UPDATE cp_agent.tickets SET source = 'CARE' WHERE source IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_tickets_external_id ON cp_agent.tickets (external_id);

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

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_hist_external_id ON cp_agent.ticket_history (external_id);

CREATE TABLE IF NOT EXISTS cp_agent.ticket_comments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
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
  external_id TEXT NOT NULL,
  code TEXT NOT NULL,
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

ALTER TABLE cp_agent.sync_logs ADD COLUMN IF NOT EXISTS sync_type TEXT DEFAULT 'full';
ALTER TABLE cp_agent.sync_logs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE cp_agent.sync_logs ADD COLUMN IF NOT EXISTS inserted_count INTEGER DEFAULT 0;
ALTER TABLE cp_agent.sync_logs ADD COLUMN IF NOT EXISTS updated_count INTEGER DEFAULT 0;
ALTER TABLE cp_agent.sync_logs ADD COLUMN IF NOT EXISTS skipped_count INTEGER DEFAULT 0;
ALTER TABLE cp_agent.sync_logs ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;
ALTER TABLE cp_agent.sync_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE cp_agent.sync_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE cp_agent.audit_logs ADD COLUMN IF NOT EXISTS actor_id INTEGER;
ALTER TABLE cp_agent.audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE cp_agent.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE cp_agent.audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE cp_agent.audit_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE cp_agent.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
