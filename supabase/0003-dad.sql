-- 16 Jul 2026: Jon goes by Dad on the board. Idempotent; already applied live.
update members set name = 'Dad' where id = '00000000-0000-4000-8000-000000000001';
-- 16 Jul 2026: Rachel goes by Rach on the board. Idempotent; already applied live.
update members set name = 'Rach' where id = '00000000-0000-4000-8000-000000000002';
