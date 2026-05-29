-- Task 1: XGBoost escalation predictions (cp_agent workspace)
CREATE TABLE IF NOT EXISTS cp_agent.ai_escalation_predictions (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  predicted_escalation_required BOOLEAN NOT NULL,
  confidence_score REAL NOT NULL,
  probability_score REAL NOT NULL,
  prediction_label TEXT NOT NULL,
  model_version TEXT NOT NULL,
  top_features JSONB,
  explanation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_ai_esc_pred_ticket
  ON cp_agent.ai_escalation_predictions (ticket_id);

CREATE INDEX IF NOT EXISTS cp_agent_ai_esc_pred_version
  ON cp_agent.ai_escalation_predictions (model_version);

CREATE INDEX IF NOT EXISTS cp_agent_ai_esc_pred_escalation
  ON cp_agent.ai_escalation_predictions (predicted_escalation_required, created_at DESC);
