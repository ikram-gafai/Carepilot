-- CARE operational synchronization window + AI recommendation metadata

ALTER TABLE care_source.tickets
  ADD COLUMN IF NOT EXISTS sync_batch integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS sub_category text,
  ADD COLUMN IF NOT EXISTS assigned_group text,
  ADD COLUMN IF NOT EXISTS assigned_agent text,
  ADD COLUMN IF NOT EXISTS ai_recommended_action text,
  ADD COLUMN IF NOT EXISTS ai_confidence real,
  ADD COLUMN IF NOT EXISTS ai_reason text,
  ADD COLUMN IF NOT EXISTS ai_status text DEFAULT 'active';

UPDATE care_source.tickets SET reference = care_ticket_id WHERE reference IS NULL;

ALTER TABLE cp_agent.tickets
  ADD COLUMN IF NOT EXISTS ai_recommended_action text,
  ADD COLUMN IF NOT EXISTS ai_confidence real,
  ADD COLUMN IF NOT EXISTS ai_reason text,
  ADD COLUMN IF NOT EXISTS ai_status text;

CREATE TABLE IF NOT EXISTS cp_agent.sync_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO cp_agent.sync_settings (key, value)
VALUES ('sync_window', 'initial')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS care_source_tickets_sync_batch ON care_source.tickets (sync_batch);
CREATE INDEX IF NOT EXISTS cp_agent_tickets_ai_action ON cp_agent.tickets (ai_recommended_action);
