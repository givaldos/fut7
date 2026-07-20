begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '61000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'schedule-owner@example.test', '', now(),
  '{}'::jsonb, '{"display_name":"Schedule Owner"}'::jsonb,
  now(), now(), '', '', '', ''
);

insert into public.teams (id, name, slug, default_sport_format, is_public, created_by)
values
  ('62000000-0000-4000-8000-000000000001', 'Agenda Pública', 'agenda-publica', 'society', true, '61000000-0000-4000-8000-000000000001'),
  ('62000000-0000-4000-8000-000000000002', 'Agenda Privada', 'agenda-privada', 'futsal', false, '61000000-0000-4000-8000-000000000001');

insert into public.events (
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, opponent_name, status, created_by
)
values
  ('63000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', 'Próximo racha', 'weekly_match', 'split_teams', 'society', now() + interval '2 days', now() + interval '2 days 90 minutes', now() + interval '1 day', null, 'scheduled', '61000000-0000-4000-8000-000000000001'),
  ('63000000-0000-4000-8000-000000000002', '62000000-0000-4000-8000-000000000001', 'Evento cancelado', 'friendly', 'single_squad', 'society', now() + interval '3 days', now() + interval '3 days 90 minutes', null, 'Adversário', 'cancelled', '61000000-0000-4000-8000-000000000001'),
  ('63000000-0000-4000-8000-000000000003', '62000000-0000-4000-8000-000000000001', 'Evento passado', 'training', 'single_squad', 'society', now() - interval '2 days', now() - interval '2 days' + interval '90 minutes', null, null, 'scheduled', '61000000-0000-4000-8000-000000000001'),
  ('63000000-0000-4000-8000-000000000004', '62000000-0000-4000-8000-000000000002', 'Jogo privado', 'championship', 'single_squad', 'futsal', now() + interval '2 days', now() + interval '2 days 60 minutes', null, null, 'scheduled', '61000000-0000-4000-8000-000000000001');

set local role anon;

select is(
  (select count(*) from public.public_team_upcoming_events where team_slug = 'agenda-publica'),
  1::bigint,
  'anonymous visitors see only scheduled future events from a public team'
);
select is(
  (select title from public.public_team_upcoming_events where team_slug = 'agenda-publica'),
  'Próximo racha'::text,
  'the public occurrence has its title'
);
select is(
  (select sport_format from public.public_team_upcoming_events where team_slug = 'agenda-publica'),
  'society'::public.sport_format,
  'the public occurrence has its sport format'
);
select is(
  (select count(*) from public.public_team_upcoming_events where team_slug = 'agenda-privada'),
  0::bigint,
  'events from private teams are hidden'
);
select is(
  (select count(*) from public.public_team_upcoming_events where event_id = '63000000-0000-4000-8000-000000000002'),
  0::bigint,
  'cancelled events are hidden'
);
select is(
  (select count(*) from public.public_team_upcoming_events where event_id = '63000000-0000-4000-8000-000000000003'),
  0::bigint,
  'past events are hidden'
);
select ok(
  has_table_privilege('anon', 'public.public_team_upcoming_events', 'SELECT'),
  'anonymous visitors may read the minimal schedule view'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_team_upcoming_events'
      and column_name in ('team_id', 'venue_id', 'venue_address', 'created_by')
  ),
  'the public view does not expose tenant ids, venue details or creator ids'
);

select * from finish();
rollback;
