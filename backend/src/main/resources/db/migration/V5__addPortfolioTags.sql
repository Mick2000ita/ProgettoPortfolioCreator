ALTER TABLE portfolios
  ADD COLUMN tags jsonb NOT NULL DEFAULT '[]'::jsonb;
