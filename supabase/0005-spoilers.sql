-- 16 Jul 2026: photos can be tagged as spoilers (blurred until tapped).
-- Idempotent; already applied live.
alter table pin_images add column if not exists is_spoiler boolean not null default false;
