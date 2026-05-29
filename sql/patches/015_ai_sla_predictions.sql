-- Task 4: SLA breach predictions on cp_agent tickets
CREATE TABLE IF NOT EXISTS cp_agent.ai_sla_predictions (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  predicted_sla_breach BOOLEAN NOT NULL,
  probability_score REAL NOT NULL,
  confidence_score REAL NOT NULL,
  risk_level TEXT NOT NULL,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_ai_sla_pred_ticket
  ON cp_agent.ai_sla_predictions (ticket_id);

CREATE INDEX IF NOT EXISTS cp_agent_ai_sla_pred_risk
  ON cp_agent.ai_sla_predictions (predicted_sla_breach, risk_level, created_at DESC);

CREATE INDEX IF NOT EXISTS cp_agent_ai_sla_pred_version
  ON cp_agent.ai_sla_predictions (model_version);
