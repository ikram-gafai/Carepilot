-- Task 3: recommended_action on ml_training + action recommendation predictions
ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS recommended_action TEXT;

UPDATE ml_training.historical_tickets
SET recommended_action = CASE
  WHEN transfer_required THEN 'TRANSFER_PERIMETER'
  WHEN escalation_required THEN 'ESCALATE_N3'
  WHEN description IS NULL OR btrim(description) = '' THEN 'REQUEST_INFORMATION'
  WHEN priority ILIKE 'low%' OR status ILIKE '%monitor%' THEN 'MONITOR'
  ELSE 'RESOLVE_LOCALLY'
END
WHERE recommended_action IS NULL;

ALTER TABLE ml_training.historical_tickets
  ALTER COLUMN recommended_action SET NOT NULL;

CREATE INDEX IF NOT EXISTS ml_training_tickets_action
  ON ml_training.historical_tickets (recommended_action);

CREATE TABLE IF NOT EXISTS cp_agent.ai_action_recommendations (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  probability_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_ai_action_rec_ticket
  ON cp_agent.ai_action_recommendations (ticket_id);

CREATE INDEX IF NOT EXISTS cp_agent_ai_action_rec_action
  ON cp_agent.ai_action_recommendations (recommended_action, created_at DESC);

CREATE INDEX IF NOT EXISTS cp_agent_ai_action_rec_version
  ON cp_agent.ai_action_recommendations (model_version);
