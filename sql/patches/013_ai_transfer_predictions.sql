-- Task 2: XGBoost transfer predictions (cp_agent workspace)
CREATE TABLE IF NOT EXISTS cp_agent.ai_transfer_predictions (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  predicted_transfer_required BOOLEAN NOT NULL,
  confidence_score REAL NOT NULL,
  probability_score REAL NOT NULL,
  prediction_label TEXT NOT NULL,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_ai_transfer_pred_ticket
  ON cp_agent.ai_transfer_predictions (ticket_id);

CREATE INDEX IF NOT EXISTS cp_agent_ai_transfer_pred_version
  ON cp_agent.ai_transfer_predictions (model_version);

CREATE INDEX IF NOT EXISTS cp_agent_ai_transfer_pred_transfer
  ON cp_agent.ai_transfer_predictions (predicted_transfer_required, created_at DESC);
