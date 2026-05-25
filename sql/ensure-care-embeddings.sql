-- Requires pgvector on the PostgreSQL host. Applied only when CREATE EXTENSION succeeds.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS carepilot.embeddings (
  id SERIAL PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  embedding vector(384) NOT NULL,
  model_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, model_name)
);
