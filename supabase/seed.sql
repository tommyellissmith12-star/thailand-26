-- The 6 family members. Ids are stable and hardcoded in src/lib/constants.ts;
-- if you change one here, change it there too.
insert into members (id, name, avatar, color, is_approver) values
  ('00000000-0000-4000-8000-000000000001', 'Jon',    '🧭', '#3E6C9E', true),
  ('00000000-0000-4000-8000-000000000002', 'Rachel', '🌺', '#C74A34', true),
  ('00000000-0000-4000-8000-000000000003', 'Ruby',   '🐘', '#7E5A9B', false),
  ('00000000-0000-4000-8000-000000000004', 'Tom',    '🛵', '#2A9D8F', false),
  ('00000000-0000-4000-8000-000000000005', 'Neve',   '🥭', '#F2A93B', false),
  ('00000000-0000-4000-8000-000000000006', 'Dale',   '🦎', '#588B4C', false);
