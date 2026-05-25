-- Store operational model: expanded catalog + ticket linkage + cp_agent denormalized store fields

ALTER TABLE care_source.stores
  ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS store_type TEXT NOT NULL DEFAULT 'Market';

ALTER TABLE care_source.tickets
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES care_source.stores (id);

UPDATE care_source.tickets t
SET store_id = s.id
FROM care_source.stores s
WHERE t.store_id IS NULL AND t.store_code IS NOT NULL AND s.store_code = t.store_code;

ALTER TABLE cp_agent.tickets
  ADD COLUMN IF NOT EXISTS store_name TEXT,
  ADD COLUMN IF NOT EXISTS store_city TEXT,
  ADD COLUMN IF NOT EXISTS store_region TEXT,
  ADD COLUMN IF NOT EXISTS store_type TEXT;

-- Normalize cp_agent.store_id to integer when legacy text ids exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'cp_agent' AND table_name = 'tickets'
      AND column_name = 'store_id' AND data_type = 'text'
  ) THEN
    ALTER TABLE cp_agent.tickets
      ALTER COLUMN store_id TYPE INTEGER USING NULLIF(regexp_replace(store_id::text, '\D', '', 'g'), '')::integer;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'cp_agent' AND table_name = 'tickets' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE cp_agent.tickets ADD COLUMN store_id INTEGER;
  END IF;
END $$;
