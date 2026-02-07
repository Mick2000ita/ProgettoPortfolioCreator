CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  description varchar,
  code varchar UNIQUE NOT NULL
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  email varchar UNIQUE NOT NULL,
  password VARCHAR(255),
  role_id uuid NOT NULL,
  username varchar,
  avatar_url text,
  last_login timestamp
);

CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  user_id uuid NOT NULL,
  title varchar NOT NULL,
  slug varchar UNIQUE NOT NULL,
  public_data json,
  wip_data json,
  is_public boolean
);

CREATE TABLE app_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  data json,
  template_type varchar
);

CREATE TABLE user_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  user_id uuid NOT NULL,
  data json,
  template_type varchar
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  portfolio_id uuid NOT NULL,
  app_template_id uuid,
  user_template_id uuid,
  name varchar,
  is_active boolean,
  data json,
  position integer NOT NULL
);

-- Foreign keys
ALTER TABLE users
  ADD CONSTRAINT fk_users_role
  FOREIGN KEY (role_id) REFERENCES roles (id);

ALTER TABLE portfolios
  ADD CONSTRAINT fk_portfolios_user
  FOREIGN KEY (user_id) REFERENCES users (id);

ALTER TABLE projects
  ADD CONSTRAINT fk_projects_portfolio
  FOREIGN KEY (portfolio_id) REFERENCES portfolios (id);

ALTER TABLE projects
  ADD CONSTRAINT fk_projects_app_template
  FOREIGN KEY (app_template_id) REFERENCES app_templates (id);

ALTER TABLE projects
  ADD CONSTRAINT fk_projects_user_template
  FOREIGN KEY (user_template_id) REFERENCES user_templates (id);

ALTER TABLE user_templates
  ADD CONSTRAINT fk_user_templates_user
  FOREIGN KEY (user_id) REFERENCES users (id);
