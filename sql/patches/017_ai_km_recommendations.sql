-- Task 6: KM retrieval recommendations on cp_agent tickets
CREATE TABLE IF NOT EXISTS cp_agent.ai_km_recommendations (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  km_id TEXT NOT NULL,
  km_title TEXT NOT NULL,
  method_name TEXT NOT NULL,
  similarity_score REAL NOT NULL,
  rank INTEGER NOT NULL,
  confidence_level TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_agent_ai_km_rec_ticket
  ON cp_agent.ai_km_recommendations (ticket_id, rank);

CREATE INDEX IF NOT EXISTS cp_agent_ai_km_rec_method
  ON cp_agent.ai_km_recommendations (method_name, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_ai_km_rec_ticket_rank
  ON cp_agent.ai_km_recommendations (ticket_id, rank);
