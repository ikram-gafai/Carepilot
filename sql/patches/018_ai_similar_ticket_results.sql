-- Task 7: Similar ticket retrieval results
CREATE TABLE IF NOT EXISTS cp_agent.ai_similar_ticket_results (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  similar_ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  similarity_score REAL NOT NULL,
  retrieval_method TEXT NOT NULL,
  rank_position INTEGER NOT NULL,
  linked_resolution TEXT,
  linked_action TEXT,
  linked_km_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cp_agent_ai_similar_ticket_ticket
  ON cp_agent.ai_similar_ticket_results (ticket_id, rank_position);

CREATE INDEX IF NOT EXISTS cp_agent_ai_similar_ticket_method
  ON cp_agent.ai_similar_ticket_results (retrieval_method, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_ai_similar_ticket_ticket_rank
  ON cp_agent.ai_similar_ticket_results (ticket_id, rank_position);
