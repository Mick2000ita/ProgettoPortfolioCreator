ALTER TABLE portfolios
  ADD COLUMN show_home_snapshot boolean NOT NULL DEFAULT true,
  ADD COLUMN show_in_explore boolean NOT NULL DEFAULT false;
