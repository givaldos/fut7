begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(26);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'operations-owner@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Operations Owner"}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'operations-outsider@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Operations Outsider"}'::jsonb, now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, default_sport_format, created_by)
values
  (
    'b1000000-0000-4000-8000-000000000001',
    'Operations Alpha',
    'operations-alpha',
    'society',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'Operations Beta',
    'operations-beta',
    'futsal',
    'a1000000-0000-4000-8000-000000000002'
  );

create temporary table operational_state (
  key text primary key,
  value uuid not null
);
grant select, insert, update on table pg_temp.operational_state to authenticated;

select ok(
  not has_table_privilege('authenticated', 'public.athletes', 'INSERT'),
  'authenticated users cannot create partial athlete records directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.athlete_private', 'INSERT'),
  'authenticated users cannot create orphan private athlete data directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.events', 'INSERT'),
  'authenticated users cannot create events without attendance atomically'
);
select ok(
  not has_table_privilege('authenticated', 'public.event_attendance', 'INSERT'),
  'authenticated users cannot bypass the attendance workflow with inserts'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_athlete_as_staff(uuid,text,text,integer,date,text,text,boolean,text[])',
    'EXECUTE'
  ),
  'authenticated staff can call the guarded athlete workflow'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_event_as_staff(uuid,text,public.event_kind,public.organization_mode,public.sport_format,timestamptz,integer,integer,integer,text,text,text)',
    'EXECUTE'
  ),
  'authenticated staff can call the guarded event workflow'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into pg_temp.operational_state (key, value)
    values (
      'athlete',
      public.create_athlete_as_staff(
        'b1000000-0000-4000-8000-000000000001',
        '  Maria da Silva  ',
        '  Maria  ',
        10,
        date '1995-05-12',
        '+5511999999999',
        'MARIA@EXAMPLE.TEST',
        true,
        array['MID', 'ST']
      )
    )
  $$,
  'team owner can create an approved athlete atomically'
);
select is(
  (
    select a.status
    from public.athletes a
    join pg_temp.operational_state s on s.value = a.id and s.key = 'athlete'
  ),
  'active'::public.athlete_status,
  'administratively created athlete is active'
);
select is(
  (
    select ap.email::text
    from public.athlete_private ap
    join pg_temp.operational_state s on s.value = ap.athlete_id and s.key = 'athlete'
  ),
  'maria@example.test',
  'private email is normalized and stored with the athlete'
);
select is(
  (
    select string_agg(app.position_code, ',' order by app.priority)
    from public.athlete_position_preferences app
    join pg_temp.operational_state s on s.value = app.athlete_id and s.key = 'athlete'
  ),
  'MID,ST',
  'position preferences preserve priority order'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$
    select public.create_athlete_as_staff(
      'b1000000-0000-4000-8000-000000000001',
      'Cross Tenant Athlete'
    )
  $$,
  '42501',
  null,
  'staff from another tenant cannot create an athlete'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into pg_temp.operational_state (key, value)
    values (
      'event',
      public.create_event_as_staff(
        'b1000000-0000-4000-8000-000000000001',
        'Racha de quinta',
        'weekly_match',
        'split_teams',
        'society',
        now() + interval '2 days',
        90,
        120,
        3,
        null,
        'Arena Central',
        'Rua do Campo, 100'
      )
    )
  $$,
  'team owner can create a weekly event series'
);
select is(
  (
    select count(*)
    from public.events e
    where e.team_id = 'b1000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'weekly creation materializes every requested occurrence'
);
select is(
  (
    select count(*)
    from public.event_series es
    where es.team_id = 'b1000000-0000-4000-8000-000000000001'
      and es.recurrence_rule = 'FREQ=WEEKLY;COUNT=3'
  ),
  1::bigint,
  'weekly occurrences remain linked to one recurrence series'
);
select is(
  (
    select count(*)
    from public.event_attendance ea
    where ea.team_id = 'b1000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'all active athletes are added to every event call list'
);
select lives_ok(
  $$
    select public.set_event_attendance_as_staff(
      (select value from pg_temp.operational_state where key = 'event'),
      (select value from pg_temp.operational_state where key = 'athlete'),
      'confirmed'
    )
  $$,
  'team staff can confirm attendance for an active athlete'
);
select is(
  (
    select ea.status
    from public.event_attendance ea
    where ea.event_id = (select value from pg_temp.operational_state where key = 'event')
      and ea.athlete_id = (select value from pg_temp.operational_state where key = 'athlete')
  ),
  'confirmed'::public.attendance_status,
  'administrative attendance response is persisted'
);

reset role;

insert into public.athletes (
  id,
  team_id,
  full_name,
  status,
  registration_source
)
values (
  'c1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  'Pending Public Athlete',
  'pending',
  'public_form'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    select public.review_athlete_registration(
      'c1000000-0000-4000-8000-000000000001',
      'approve'
    )
  $$,
  'team staff can approve a pending public registration'
);
select is(
  (
    select a.status
    from public.athletes a
    where a.id = 'c1000000-0000-4000-8000-000000000001'
  ),
  'active'::public.athlete_status,
  'approved registration becomes an active athlete'
);
select is(
  (
    select count(*)
    from public.event_attendance ea
    where ea.athlete_id = 'c1000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'approval adds the athlete to every future call list'
);
select lives_ok(
  $$
    select public.set_athlete_availability(
      'c1000000-0000-4000-8000-000000000001',
      'inactive'
    )
  $$,
  'staff can make an active athlete unavailable'
);
select is(
  (
    select a.status
    from public.athletes a
    where a.id = 'c1000000-0000-4000-8000-000000000001'
  ),
  'inactive'::public.athlete_status,
  'availability change is persisted'
);
select throws_ok(
  $$
    select public.review_athlete_registration(
      'c1000000-0000-4000-8000-000000000001',
      'approve'
    )
  $$,
  '55000',
  null,
  'a reviewed registration cannot be reviewed twice'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$
    select public.set_event_attendance_as_staff(
      (select value from pg_temp.operational_state where key = 'event'),
      (select value from pg_temp.operational_state where key = 'athlete'),
      'declined'
    )
  $$,
  '42501',
  null,
  'staff from another tenant cannot change attendance'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$
    select public.create_event_as_staff(
      'b1000000-0000-4000-8000-000000000001',
      'Past event',
      'friendly',
      'single_squad',
      'society',
      now() - interval '1 day',
      90,
      60
    )
  $$,
  '22023',
  null,
  'events cannot be created in the past'
);
select is(
  (
    select count(*)
    from public.audit_logs al
    where al.team_id = 'b1000000-0000-4000-8000-000000000001'
      and al.action = 'events.insert'
  ),
  3::bigint,
  'every generated event occurrence is audited'
);

select * from finish();
rollback;
