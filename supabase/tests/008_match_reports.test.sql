begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'match-owner@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Match Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'match-player@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Match Player"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'match-outsider@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Match Outsider"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, default_sport_format, created_by)
values
  (
    '82000000-0000-4000-8000-000000000001',
    'Match Alpha',
    'match-alpha',
    'society',
    '81000000-0000-4000-8000-000000000001'
  ),
  (
    '82000000-0000-4000-8000-000000000002',
    'Match Beta',
    'match-beta',
    'futsal',
    '81000000-0000-4000-8000-000000000003'
  );

insert into public.athletes (
  id, team_id, user_id, full_name, status, registration_source
)
values
  (
    '83000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000002',
    'Atleta principal',
    'active',
    'public_form'
  ),
  (
    '83000000-0000-4000-8000-000000000002',
    '82000000-0000-4000-8000-000000000001',
    null,
    'Atleta assistente',
    'active',
    'admin'
  ),
  (
    '83000000-0000-4000-8000-000000000003',
    '82000000-0000-4000-8000-000000000001',
    null,
    'Atleta não confirmado',
    'active',
    'admin'
  );

insert into public.player_profiles (
  user_id, handle, display_name, is_public, phone_verified_at
)
values (
  '81000000-0000-4000-8000-000000000002',
  'match-player',
  'Match Player',
  true,
  now()
);

insert into public.events (
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values
  (
    '84000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    'Racha com súmula',
    'weekly_match',
    'split_teams',
    'society',
    now() - interval '2 hours',
    now() - interval '30 minutes',
    now() - interval '3 hours',
    'scheduled',
    '81000000-0000-4000-8000-000000000001'
  ),
  (
    '84000000-0000-4000-8000-000000000002',
    '82000000-0000-4000-8000-000000000001',
    'Racha futuro',
    'weekly_match',
    'split_teams',
    'society',
    now() + interval '2 hours',
    now() + interval '4 hours',
    now() + interval '1 hour',
    'scheduled',
    '81000000-0000-4000-8000-000000000001'
  );

insert into public.event_attendance (event_id, team_id, athlete_id, status)
values
  (
    '84000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    'confirmed'
  ),
  (
    '84000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000002',
    'confirmed'
  ),
  (
    '84000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000003',
    'pending'
  ),
  (
    '84000000-0000-4000-8000-000000000002',
    '82000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    'confirmed'
  );

select ok(
  not has_table_privilege('authenticated', 'public.match_reports', 'INSERT'),
  'authenticated users cannot insert match reports directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.match_incidents', 'INSERT'),
  'authenticated users cannot insert match incidents directly'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.save_match_report_as_staff(uuid,text,text,integer,integer,text,boolean)',
    'EXECUTE'
  ),
  'authenticated staff can call the guarded report workflow'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.add_match_incident_as_staff(uuid,public.match_incident_kind,uuid,uuid,integer,integer,text)',
    'EXECUTE'
  ),
  'authenticated staff can call the guarded incident workflow'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.delete_match_incident_as_staff(uuid)',
    'EXECUTE'
  ),
  'authenticated staff can correct an incident through the guarded workflow'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    select public.add_match_incident_as_staff(
      '84000000-0000-4000-8000-000000000001',
      'goal',
      '83000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000002',
      1,
      12,
      'Chute cruzado'
    )
  $$,
  'staff can record a goal with an assist'
);
select lives_ok(
  $$
    select public.add_match_incident_as_staff(
      '84000000-0000-4000-8000-000000000001',
      'goal',
      '83000000-0000-4000-8000-000000000002',
      '83000000-0000-4000-8000-000000000001',
      2,
      24,
      null
    )
  $$,
  'staff can record a second goal and reverse the assist attribution'
);
select lives_ok(
  $$
    select public.add_match_incident_as_staff(
      '84000000-0000-4000-8000-000000000001',
      'yellow_card',
      '83000000-0000-4000-8000-000000000001',
      null,
      null,
      31,
      null
    )
  $$,
  'staff can record a yellow card'
);
select is(
  (
    select report.side_a_score::text || ':' || report.side_b_score::text
    from public.match_reports report
    where report.event_id = '84000000-0000-4000-8000-000000000001'
  ),
  '1:1',
  'goals increment the corresponding score automatically'
);
select throws_ok(
  $$
    select public.add_match_incident_as_staff(
      '84000000-0000-4000-8000-000000000001',
      'red_card',
      '83000000-0000-4000-8000-000000000003',
      null,
      null,
      35,
      null
    )
  $$,
  '55000',
  null,
  'an unconfirmed athlete cannot receive a match statistic'
);
select lives_ok(
  $$
    select public.add_match_incident_as_staff(
      '84000000-0000-4000-8000-000000000002',
      'goal',
      '83000000-0000-4000-8000-000000000001',
      null,
      1
    )
  $$,
  'staff can prepare a future match report for a confirmed athlete'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);

select is(
  (
    select stats.matches_played::text || ':' || stats.goals::text || ':' || stats.assists::text
    from public.get_my_player_statistics() stats
  ),
  '0:0:0',
  'draft reports do not count toward player statistics'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    select public.save_match_report_as_staff(
      '84000000-0000-4000-8000-000000000001',
      'Verde',
      'Branco',
      1,
      1,
      'Partida equilibrada',
      true
    )
  $$,
  'staff can finalize a report after the match starts'
);
select is(
  (
    select event.status
    from public.events event
    where event.id = '84000000-0000-4000-8000-000000000001'
  ),
  'completed'::public.event_status,
  'finalizing the report completes the event'
);
select ok(
  (
    select report.finalized_at is not null and report.finalized_by is not null
    from public.match_reports report
    where report.event_id = '84000000-0000-4000-8000-000000000001'
  ),
  'the finalization actor and timestamp are stored'
);
select throws_ok(
  $$
    select public.save_match_report_as_staff(
      '84000000-0000-4000-8000-000000000001',
      'Verde',
      'Branco',
      0,
      0,
      null,
      false
    )
  $$,
  '23514',
  null,
  'the manual score cannot be lower than logged goals'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);

select is(
  (
    select
      stats.matches_played::text || ':' ||
      stats.goals::text || ':' ||
      stats.assists::text || ':' ||
      stats.yellow_cards::text || ':' ||
      stats.red_cards::text
    from public.get_my_player_statistics() stats
  ),
  '1:1:1:1:0',
  'the player sees only finalized goals, assists and cards attributed to their BID'
);

reset role;
set local role anon;

select is(
  (
    select
      stats.matches_played::text || ':' ||
      stats.goals::text || ':' ||
      stats.assists::text
    from public.get_public_player_statistics('match-player') stats
  ),
  '1:1:1',
  'a public profile exposes only finalized aggregate statistics'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
select is(
  (
    select count(*)
    from public.match_reports report
    where report.event_id = '84000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'an approved player can read the report for their team'
);
select throws_ok(
  $$
    select public.add_match_incident_as_staff(
      '84000000-0000-4000-8000-000000000001',
      'red_card',
      '83000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'a player cannot mutate the match report'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);

select throws_ok(
  $$
    select public.add_match_incident_as_staff(
      '84000000-0000-4000-8000-000000000001',
      'red_card',
      '83000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'staff from another tenant cannot mutate the match report'
);
select is(
  (
    select count(*)
    from public.match_reports report
    where report.event_id = '84000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'staff from another tenant cannot read the match report'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    select public.delete_match_incident_as_staff(
      (
        select incident.id
        from public.match_incidents incident
        where incident.event_id = '84000000-0000-4000-8000-000000000001'
          and incident.kind = 'goal'
          and incident.athlete_id = '83000000-0000-4000-8000-000000000001'
      )
    )
  $$,
  'staff can correct an incorrectly attributed goal'
);
select is(
  (
    select report.side_a_score
    from public.match_reports report
    where report.event_id = '84000000-0000-4000-8000-000000000001'
  ),
  0::smallint,
  'deleting a goal corrects the corresponding score'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);

select is(
  (
    select stats.goals::text || ':' || stats.assists::text
    from public.get_my_player_statistics() stats
  ),
  '0:1',
  'player statistics reflect audited corrections in real time'
);

reset role;
select is(
  (
    select count(*)
    from public.audit_logs audit
    where audit.team_id = '82000000-0000-4000-8000-000000000001'
      and audit.action = 'match_incidents.insert'
  ),
  4::bigint,
  'every created match incident is audited'
);
select is(
  (
    select count(*)
    from public.audit_logs audit
    where audit.team_id = '82000000-0000-4000-8000-000000000001'
      and audit.action = 'match_incidents.delete'
  ),
  1::bigint,
  'incident corrections are audited'
);

select * from finish();
rollback;
