-- Verdicts update, 16 Jul 2026. Idempotent; already applied to the live project.
-- Adds Jon & Rachel's rejection verdicts and the new member avatars.

alter type pin_status add value if not exists 'torched';
alter type pin_status add value if not exists 'shat';

update members set avatar = v.a
from (values
  ('Jon','🤴'), ('Rachel','👸'), ('Ruby','🌼'),
  ('Tom','🤠'), ('Neve','🌺'), ('Dale','🏄‍♂️')
) as v(n, a)
where members.name = v.n;
