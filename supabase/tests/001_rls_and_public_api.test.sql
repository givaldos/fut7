begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(21);

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
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'owner-a@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{"display_name":"Owner A"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'owner-b@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{"display_name":"Owner B"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'authenticated',
    'authenticated',
    'player@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{"display_name":"Player C"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into public.teams (id, name, slug, created_by)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Time Alpha',
    'time-alpha',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Time Beta',
    'time-beta',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  );

insert into public.athletes (
  id,
  team_id,
  user_id,
  full_name,
  status,
  public_profile,
  created_by
)
values
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    null,
    'Atleta do elenco',
    'active',
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Atleta com conta',
    'active',
    false,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

insert into public.athlete_private (athlete_id, team_id, phone_e164)
values
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    '+5511999990001'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '11111111-1111-4111-8111-111111111111',
    '+5511999990002'
  );

insert into public.events (
  id,
  team_id,
  title,
  kind,
  sport_format,
  starts_at,
  ends_at,
  attendance_deadline,
  created_by
)
values
  (
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    'Evento aberto',
    'weekly_match',
    'society',
    now() + interval '1 day',
    now() + interval '1 day 2 hours',
    now() + interval '1 hour',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    '11111111-1111-4111-8111-111111111111',
    'Evento fechado',
    'weekly_match',
    'society',
    now() + interval '1 day',
    now() + interval '1 day 2 hours',
    now() - interval '1 hour',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

insert into public.event_attendance (event_id, team_id, athlete_id)
values
  (
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444444'
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444444'
  );

select is(
  private.try_uuid('not-a-uuid'),
  null::uuid,
  'invalid storage path prefixes are handled without a cast exception'
);

select is(
  (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'profiles', 'teams', 'team_memberships', 'positions', 'athletes',
        'athlete_private', 'athlete_position_preferences', 'venues',
        'event_series', 'events', 'event_attendance', 'event_squads',
        'lineup_spots', 'communication_consents', 'notification_outbox',
        'audit_logs', 'team_invitations'
      )
      and c.relrowsecurity = true
  ),
  17::bigint,
  'all public domain tables have RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.teams', 'SELECT'),
  'anon cannot query the tenant table directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.submit_athlete_registration(text,text,text,date,text,text,boolean,boolean)',
    'EXECUTE'
  ),
  'anon cannot bypass the protected registration action'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.submit_athlete_registration(text,text,text,date,text,text,boolean,boolean)',
    'EXECUTE'
  ),
  'service role can call the narrow registration RPC'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.teams), 1::bigint, 'owner sees only their team');
select throws_ok(
  $$
    insert into public.athletes (team_id, full_name, created_by)
    values (
      '22222222-2222-4222-8222-222222222222',
      'Tentativa cross-tenant',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    )
  $$,
  '42501',
  null,
  'owner cannot insert an athlete into another tenant'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);

select is((select count(*) from public.teams), 1::bigint, 'active player can access their team');
select is((select count(*) from public.athletes), 2::bigint, 'player can see the team roster');
select is(
  (select count(*) from public.athlete_private),
  1::bigint,
  'player can only see their own private athlete record'
);
select is(
  (select count(*) from public.event_series),
  0::bigint,
  'player cannot inspect recurring-series administration'
);
select lives_ok(
  $$
    update public.event_attendance
    set
      status = 'confirmed',
      source = 'web',
      responded_by = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      responded_at = now()
    where event_id = '55555555-5555-4555-8555-555555555555'
      and athlete_id = '44444444-4444-4444-8444-444444444444'
  $$,
  'player can answer while the confirmation window is open'
);
select lives_ok(
  $$
    update public.event_attendance
    set
      status = 'confirmed',
      source = 'web',
      responded_by = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      responded_at = now()
    where event_id = '66666666-6666-4666-8666-666666666666'
      and athlete_id = '44444444-4444-4444-8444-444444444444'
  $$,
  'late self-service update is safely filtered by RLS'
);
select is(
  (
    select status
    from public.event_attendance
    where event_id = '66666666-6666-4666-8666-666666666666'
      and athlete_id = '44444444-4444-4444-8444-444444444444'
  ),
  'pending'::public.attendance_status,
  'player cannot change attendance after the confirmation deadline'
);

reset role;
set local role anon;

select is(
  (
    select count(*)
    from public.public_team_directory
    where slug in ('time-alpha', 'time-beta')
  ),
  2::bigint,
  'anon can read the deliberately safe team directory'
);
select is(
  (select count(*) from public.public_athlete_directory where team_slug = 'time-alpha'),
  1::bigint,
  'public roster exposes only active opt-in athletes'
);
select is((select count(*) from public.positions), 18::bigint, 'position catalog is public');

reset role;
set local role service_role;

select lives_ok(
  $$
    select public.submit_athlete_registration(
      'time-alpha',
      'Cadastro Público',
      'Novo',
      null,
      '+5511999997777',
      null,
      true,
      true
    )
  $$,
  'server can submit a validated public registration'
);
select throws_ok(
  $$
    select public.submit_athlete_registration(
      'time-alpha',
      'Data Inválida',
      null,
      date '1899-12-31',
      '+5511999998888',
      null,
      true,
      false
    )
  $$,
  '22023',
  null,
  'server rejects implausible birth dates even through the privileged RPC'
);

reset role;
select is(
  (
    select count(*)
    from public.athletes
    where team_id = '11111111-1111-4111-8111-111111111111'
      and registration_source = 'public_form'
      and status = 'pending'
  ),
  1::bigint,
  'public registration is created as pending'
);
select is(
  (
    select count(*)
    from public.public_athlete_directory
    where team_slug = 'time-alpha'
      and display_name = 'Novo'
  ),
  0::bigint,
  'pending registration is never exposed by the public directory'
);

select * from finish();
rollback;
