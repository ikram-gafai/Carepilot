-- Task 8: Missing information / operational completeness analysis
CREATE TABLE IF NOT EXISTS cp_agent.ai_missing_information_analysis (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  missing_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  completeness_score REAL NOT NULL,
  quality_level TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  detection_method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cp_agent_ai_missing_info_ticket
  ON cp_agent.ai_missing_information_analysis (ticket_id);

CREATE INDEX IF NOT EXISTS cp_agent_ai_missing_info_quality
  ON cp_agent.ai_missing_information_analysis (quality_level, created_at DESC);

CREATE INDEX IF NOT EXISTS cp_agent_ai_missing_info_method
  ON cp_agent.ai_missing_information_analysis (detection_method, created_at DESC);
