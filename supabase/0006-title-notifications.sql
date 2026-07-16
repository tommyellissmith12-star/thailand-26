-- 17 Jul 2026 night shift: editable app title (admin only) + in-app
-- notifications with DB triggers. Idempotent; already applied live.

create table if not exists app_settings (
  id              int primary key default 1 check (id = 1),
  title           text not null default 'Thailand ''26',
  admin_member_id uuid references members(id)
);

insert into app_settings (id, title, admin_member_id)
values (1, 'Thailand ''26', '00000000-0000-4000-8000-000000000004') -- Tom
on conflict (id) do nothing;

create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references members(id),
  actor_id     uuid not null references members(id),
  kind         text not null check (kind in ('reaction','comment')),
  pin_id       uuid references pins(id) on delete cascade,
  emoji        text,
  body         text,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table app_settings  enable row level security;
alter table notifications enable row level security;

do $$ begin
  create policy "family all" on app_settings  for all to anon using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "family all" on notifications for all to anon using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table app_settings;
exception when duplicate_object then null; end $$;

-- Tell the pin's creator when someone reacts (not their own reactions)
create or replace function notify_reaction() returns trigger
language plpgsql security definer as $$
declare creator uuid;
begin
  select created_by into creator from pins where id = new.pin_id;
  if creator is not null and creator <> new.member_id then
    insert into notifications (recipient_id, actor_id, kind, pin_id, emoji)
    values (creator, new.member_id, 'reaction', new.pin_id, new.emoji);
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_reaction on reactions;
create trigger trg_notify_reaction
  after insert on reactions
  for each row execute function notify_reaction();

-- Tell the pin's creator when someone comments (not their own comments)
create or replace function notify_comment() returns trigger
language plpgsql security definer as $$
declare creator uuid;
begin
  select created_by into creator from pins where id = new.pin_id;
  if creator is not null and creator <> new.member_id then
    insert into notifications (recipient_id, actor_id, kind, pin_id, body)
    values (creator, new.member_id, 'comment', new.pin_id, left(new.body, 140));
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_comment on comments;
create trigger trg_notify_comment
  after insert on comments
  for each row execute function notify_comment();
