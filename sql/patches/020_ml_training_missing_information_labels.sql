-- Task 8: multilabel missing information ground truth on ML training corpus
ALTER TABLE ml_training.historical_tickets
  ADD COLUMN IF NOT EXISTS missing_information_labels JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS ml_training_tickets_missing_info_labels
  ON ml_training.historical_tickets USING gin (missing_information_labels);
