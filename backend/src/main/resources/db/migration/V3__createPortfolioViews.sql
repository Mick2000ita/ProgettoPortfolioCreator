CREATE TABLE portfolio_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  portfolio_id uuid NOT NULL
);

ALTER TABLE portfolio_views
  ADD CONSTRAINT fk_portfolio_views_portfolio
  FOREIGN KEY (portfolio_id) REFERENCES portfolios (id) ON DELETE CASCADE;

CREATE INDEX idx_portfolio_views_portfolio_created
  ON portfolio_views (portfolio_id, created);
