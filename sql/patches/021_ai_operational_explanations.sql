-- Task 9: LLM operational explanation layer (Ollama local inference)
CREATE TABLE IF NOT EXISTS cp_agent.ai_operational_explanations (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  operational_summary TEXT NOT NULL,
  recommended_action_explanation TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  missing_information_note TEXT NOT NULL DEFAULT '',
  next_steps TEXT NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_ai_operational_explanations_ticket
  ON cp_agent.ai_operational_explanations (ticket_id);

CREATE INDEX IF NOT EXISTS cp_agent_ai_operational_explanations_model
  ON cp_agent.ai_operational_explanations (model_name, created_at DESC);
