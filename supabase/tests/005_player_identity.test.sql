begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(30);

insert into auth.users (
  instance_id, id, aud, role, email, phone, encrypted_password,
  email_confirmed_at, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '51000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'player-owner@example.test', null, '',
    now(), null, '{}'::jsonb, '{"display_name":"Player Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '51000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', null, '5511999990101', '',
    null, now(), '{"provider":"phone","providers":["phone"]}'::jsonb,
    '{"display_name":"Jogador Verificado"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '51000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', null, '5511999990102', '',
    null, null, '{"provider":"phone","providers":["phone"]}'::jsonb,
    '{"display_name":"Jogador Não Verificado"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, default_sport_format, created_by)
values
  (
    '52000000-0000-4000-8000-000000000001',
    'Identidade Alpha',
    'identidade-alpha',
    'society',
    '51000000-0000-4000-8000-000000000001'
  ),
  (
    '52000000-0000-4000-8000-000000000002',
    'Identidade Beta',
    'identidade-beta',
    'futsal',
    '51000000-0000-4000-8000-000000000001'
  );

insert into public.events (
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, created_by
)
values (
  '53000000-0000-4000-8000-000000000001',
  '52000000-0000-4000-8000-000000000001',
  'Jogo da identidade',
  'weekly_match',
  'split_teams',
  'society',
  now() + interval '2 days',
  now() + interval '2 days 90 minutes',
  now() + interval '1 day',
  '51000000-0000-4000-8000-000000000001'
);

create temporary table player_state (
  key text primary key,
  value uuid not null
);
grant select, insert, update on table pg_temp.player_state to authenticated;

select ok(
  (
    select count(*) = 2
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('player_profiles', 'player_position_preferences')
      and c.relrowsecurity = true
  ),
  'global player tables enforce RLS'
);
select ok(
  not has_table_privilege('anon', 'public.player_profiles', 'SELECT'),
  'anonymous users cannot query private player profiles directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.complete_verified_athlete_registration(text,text,text,text,boolean,boolean,text[])',
    'EXECUTE'
  ),
  'anonymous users cannot create a BID relationship'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.complete_verified_athlete_registration(text,text,text,text,boolean,boolean,text[])',
    'EXECUTE'
  ),
  'authenticated phone users can call the guarded registration workflow'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$
    insert into pg_temp.player_state (key, value)
    values (
      'athlete',
      public.complete_verified_athlete_registration(
        'identidade-alpha',
        '  João Verificado  ',
        '  João  ',
        '1994-03-14',
        true,
        true,
        array['MID', 'ST']
      )
    )
  $$,
  'verified phone user can submit a team application'
);
select is(
  (select athlete_status from public.list_my_player_team_links()),
  'pending'::public.athlete_status,
  'new team relationship waits for owner approval'
);
select is(
  private.is_athlete_self((select value from pg_temp.player_state where key = 'athlete')),
  true,
  'BID relationship uses the authenticated identity'
);
select is(
  (select ap.phone_e164 from public.athlete_private ap join pg_temp.player_state s on s.value = ap.athlete_id),
  '+5511999990101',
  'BID stores the phone verified by Auth instead of browser input'
);
select is(
  (select pp.display_name from public.player_profiles pp),
  'João Verificado',
  'registration creates the global personal profile'
);
select is(
  (select count(*) from public.list_my_player_team_links()),
  1::bigint,
  'player can see their safe pending team relationship'
);
select is(
  (select count(*) from public.teams),
  0::bigint,
  'pending relationship does not grant team access'
);
select is(
  public.complete_verified_athlete_registration(
    'identidade-alpha', 'João Verificado', 'João', '1994-03-14',
    true, true, array['MID', 'ST']
  ),
  (select value from pg_temp.player_state where key = 'athlete'),
  'repeated completion is idempotent for the same user and team'
);

reset role;
set local role anon;
select is(
  (
    select count(*)
    from public.public_player_directory
    where handle = 'atleta-510000000000'
  ),
  0::bigint,
  'private personal profile is not published'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000001', true);

select is(
  (
    select count(*)
    from public.athletes a
    where a.team_id = '52000000-0000-4000-8000-000000000001'
      and a.status = 'pending'
  ),
  1::bigint,
  'team owner sees the verified pending BID'
);
select lives_ok(
  $$
    select public.review_athlete_registration(
      (select value from pg_temp.player_state where key = 'athlete'),
      'approve'
    )
  $$,
  'owner can approve the verified team relationship'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000002', true);

select is((select count(*) from public.teams), 1::bigint, 'approval grants access to that team');
select is(
  (
    select count(*)
    from public.event_attendance ea
    where ea.athlete_id = (select value from pg_temp.player_state where key = 'athlete')
  ),
  1::bigint,
  'approval adds the player to future event calls'
);
select lives_ok(
  $$
    select public.respond_to_event_as_player(
      '53000000-0000-4000-8000-000000000001',
      'confirmed'
    )
  $$,
  'approved player can confirm their own attendance'
);
select is(
  (
    select ea.status
    from public.event_attendance ea
    where ea.event_id = '53000000-0000-4000-8000-000000000001'
      and ea.athlete_id = (select value from pg_temp.player_state where key = 'athlete')
  ),
  'confirmed'::public.attendance_status,
  'personal attendance response is persisted'
);
select lives_ok(
  $$
    select public.update_my_player_profile(
      'joao-verificado',
      'João da Silva',
      'João',
      'Meia que também joga no ataque.',
      true,
      array['CM'],
      array['MID', 'ST'],
      array['ALA']
    )
  $$,
  'player can improve and publish their personal profile'
);
select is(
  (select pp.handle::text from public.player_profiles pp),
  'joao-verificado',
  'custom public handle is persisted'
);
select is(
  (select count(*) from public.player_position_preferences),
  4::bigint,
  'global profile stores preferences for every football format'
);
select is(
  (
    select count(*)
    from public.athlete_position_preferences app
    where app.athlete_id = (select value from pg_temp.player_state where key = 'athlete')
  ),
  2::bigint,
  'team BID materializes only positions from that team sport format'
);

reset role;
set local role anon;
select is(
  (select count(*) from public.public_player_directory where handle = 'joao-verificado'),
  1::bigint,
  'published profile appears in the safe public directory'
);
select is(
  (select count(*) from public.public_athlete_directory where team_slug = 'identidade-alpha'),
  1::bigint,
  'published approved player appears in the team public roster'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$
    select public.complete_verified_athlete_registration(
      'identidade-alpha', 'Não Verificado', null, null,
      true, false, array[]::text[]
    )
  $$,
  '42501',
  null,
  'unverified phone account cannot create a BID'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$
    insert into pg_temp.player_state (key, value)
    values (
      'athlete-beta',
      public.complete_verified_athlete_registration(
        'identidade-beta', 'João da Silva', 'João', '1994-03-14',
        true, true, array['ALA']
      )
    )
  $$,
  'one personal identity can request access to another team'
);
select is(
  (select count(*) from public.list_my_player_team_links()),
  2::bigint,
  'personal portal lists all team relationships'
);
select is(
  (
    select athlete_status
    from public.list_my_player_team_links()
    where team_slug = 'identidade-beta'
  ),
  'pending'::public.athlete_status,
  'each new team relationship requires independent approval'
);
select is(
  (select count(*) from public.teams),
  1::bigint,
  'pending second team remains inaccessible while approved team stays available'
);

select * from finish();
rollback;
