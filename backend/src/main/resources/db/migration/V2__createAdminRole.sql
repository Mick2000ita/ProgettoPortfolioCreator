INSERT INTO roles (code, description) VALUES ('ADMIN', 'Administrator role with full access to the system');
INSERT INTO roles (code, description) VALUES ('USER', 'User of portfolio creator');


INSERT INTO users (
  email,
  username,
  password,
  role_id,
  avatar_url
) VALUES (
  'admin@example.com',
  'admin',
  '$2a$10$7Qy8n9s1v5Z5z5z5z5z5u5u5u5u5u5u5u5u5u5u5u5u5u5u', -- password: admin
  (SELECT id FROM roles WHERE code = 'ADMIN'),
  'https://t4.ftcdn.net/jpg/04/75/00/99/360_F_475009987_zwsk4c77x3cTpcI3W1C1LU4pOSyPKaqi.jpg'
);
