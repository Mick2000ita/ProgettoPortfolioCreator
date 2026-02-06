CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid () NOT NULL,
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  email varchar UNIQUE NOT NULL,
  password VARCHAR(255),
  role_id uuid NOT NULL,
  username varchar,
  avatar_url text,
  last_login timestamp,

);

CREATE TABLE roles (
  id UUID DEFAULT gen_random_uuid () NOT NULL,
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  description varchar,
  code varchar UNIQUE NOT NULL,

);

CREATE TABLE portfolios (
  id UUID DEFAULT gen_random_uuid () NOT NULL,
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  user_id uuid NOT NULL,
  title varchar NOT NULL,
  slug varchar UNIQUE NOT NULL,
  public_data json,
  wip_data json,
  is_public boolean,

);

CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid () NOT NULL,
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  portfolio_id uuid NOT NULL,
  app_template_id uuid,
  user_template_id uuid,
  name varchar,
  position integer NOT NULL,

);

CREATE TABLE app_templates (
  id UUID DEFAULT gen_random_uuid () NOT NULL,
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  data json,
  template_type varchar,

);

CREATE TABLE user_templates (
  id UUID DEFAULT gen_random_uuid () NOT NULL,
  created TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  user_id uuid NOT NULL,
  data json,
  template_type varchar,

);

ALTER TABLE users ADD FOREIGN KEY (role_id) REFERENCES roles (id);

ALTER TABLE portfolios ADD FOREIGN KEY (user_id) REFERENCES users (id);

ALTER TABLE projects ADD FOREIGN KEY (app_template_id) REFERENCES app_templates (id);

ALTER TABLE user_templates ADD FOREIGN KEY (user_id) REFERENCES users (id);

ALTER TABLE projects ADD FOREIGN KEY (user_template_id) REFERENCES user_templates (id);

ALTER TABLE projects ADD FOREIGN KEY (portfolio_id) REFERENCES portfolios (id);