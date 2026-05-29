-- Task 5: priority predictions on cp_agent tickets
CREATE TABLE IF NOT EXISTS cp_agent.ai_priority_predictions (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  predicted_priority TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  probability_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_ai_priority_pred_ticket
  ON cp_agent.ai_priority_predictions (ticket_id);

CREATE INDEX IF NOT EXISTS cp_agent_ai_priority_pred_priority
  ON cp_agent.ai_priority_predictions (predicted_priority, created_at DESC);

CREATE INDEX IF NOT EXISTS cp_agent_ai_priority_pred_version
  ON cp_agent.ai_priority_predictions (model_version);
