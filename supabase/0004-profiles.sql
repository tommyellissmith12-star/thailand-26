-- 16 Jul 2026: in-app profiles. Members can change nickname, emoji, and add a
-- profile photo. Idempotent; already applied live.

alter table members add column if not exists photo_path text;

-- Live-sync profile changes to everyone's phones
do $$
begin
  alter publication supabase_realtime add table members;
exception when duplicate_object then null;
end $$;
