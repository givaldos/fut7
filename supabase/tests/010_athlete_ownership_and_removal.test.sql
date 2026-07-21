begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(31);

insert into auth.users (
  instance_id, id, aud, role, email, phone, encrypted_password,
  email_confirmed_at, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'lifecycle-owner@example.test', null, '',
    now(), null, '{}'::jsonb, '{"display_name":"Lifecycle Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'lifecycle-admin@example.test', null, '',
    now(), null, '{}'::jsonb, '{"display_name":"Lifecycle Admin"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'lifecycle-manager@example.test', null, '',
    now(), null, '{}'::jsonb, '{"display_name":"Lifecycle Manager"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', null, '+5511999990404', '',
    null, now(), '{"provider":"phone","providers":["phone"]}'::jsonb,
    '{"display_name":"Lifecycle Player"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, default_sport_format, created_by)
values
  (
    '92000000-0000-4000-8000-000000000001',
    'Lifecycle Alpha',
    'lifecycle-alpha',
    'society',
    '91000000-0000-4000-8000-000000000001'
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    'Lifecycle Beta',
    'lifecycle-beta',
    'futsal',
    '91000000-0000-4000-8000-000000000001'
  );

insert into public.team_memberships (team_id, user_id, role, status, invited_by)
values
  (
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000002',
    'admin', 'active', '91000000-0000-4000-8000-000000000001'
  ),
  (
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000003',
    'manager', 'active', '91000000-0000-4000-8000-000000000001'
  );

insert into public.player_profiles (
  user_id, handle, display_name, preferred_name, is_public, phone_verified_at
)
values (
  '91000000-0000-4000-8000-000000000004',
  'lifecycle-player',
  'Lifecycle Player',
  'Player',
  true,
  now()
);

insert into public.athletes (
  id, team_id, user_id, full_name, preferred_name, shirt_number,
  status, registration_source, public_profile, created_by
)
values
  (
    '93000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    null,
    'Cadastro Provisório',
    'Provisório',
    7,
    'active', 'admin', true,
    '91000000-0000-4000-8000-000000000001'
  ),
  (
    '93000000-0000-4000-8000-000000000002',
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000004',
    'Lifecycle Player',
    'Player',
    10,
    'active', 'public_form', false,
    '91000000-0000-4000-8000-000000000004'
  ),
  (
    '93000000-0000-4000-8000-000000000003',
    '92000000-0000-4000-8000-000000000002',
    '91000000-0000-4000-8000-000000000004',
    'Lifecycle Player',
    'Player',
    4,
    'active', 'public_form', false,
    '91000000-0000-4000-8000-000000000004'
  );

insert into public.athlete_private (
  athlete_id, team_id, birth_date, phone_e164, email, notes
)
values
  (
    '93000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    date '1992-02-02', '+5511999990101', 'old@example.test', 'Nota antiga'
  ),
  (
    '93000000-0000-4000-8000-000000000002',
    '92000000-0000-4000-8000-000000000001',
    date '1994-04-04', '+5511999990404', 'player@example.test', 'Nota do time'
  );

insert into public.athlete_position_preferences (
  athlete_id, team_id, sport_format, position_code, priority
)
values
  (
    '93000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    'society', 'MID', 1
  ),
  (
    '93000000-0000-4000-8000-000000000002',
    '92000000-0000-4000-8000-000000000001',
    'society', 'ST', 1
  );

insert into public.events (
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values
  (
    '94000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    'Partida histórica', 'weekly_match', 'split_teams', 'society',
    now() - interval '2 days', now() - interval '2 days' + interval '90 minutes',
    now() - interval '3 days', 'completed',
    '91000000-0000-4000-8000-000000000001'
  ),
  (
    '94000000-0000-4000-8000-000000000002',
    '92000000-0000-4000-8000-000000000001',
    'Próxima partida', 'weekly_match', 'split_teams', 'society',
    now() + interval '2 days', now() + interval '2 days' + interval '90 minutes',
    now() + interval '1 day', 'scheduled',
    '91000000-0000-4000-8000-000000000001'
  );

insert into public.event_attendance (
  event_id, team_id, athlete_id, status, source, responded_at
)
values
  (
    '94000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000002',
    'confirmed', 'web', now() - interval '3 days'
  ),
  (
    '94000000-0000-4000-8000-000000000002',
    '92000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000002',
    'confirmed', 'web', now()
  );

insert into public.match_reports (
  id, event_id, team_id, side_a_label, side_b_label,
  side_a_score, side_b_score, finalized_at, finalized_by, created_by
)
values (
  '95000000-0000-4000-8000-000000000001',
  '94000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  'Verde', 'Branco', 1, 0, now() - interval '2 days',
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001'
);

insert into public.match_incidents (
  id, event_id, team_id, kind, athlete_id, scoring_side, created_by
)
values (
  '96000000-0000-4000-8000-000000000001',
  '94000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  'goal', '93000000-0000-4000-8000-000000000002', 1,
  '91000000-0000-4000-8000-000000000001'
);

select ok(
  not has_table_privilege('authenticated', 'public.athletes', 'UPDATE'),
  'authenticated users cannot bypass athlete ownership through direct updates'
);
select ok(
  not has_table_privilege('authenticated', 'public.athlete_private', 'UPDATE'),
  'authenticated users cannot bypass private-data ownership through direct updates'
);
select ok(
  not has_table_privilege('authenticated', 'public.athlete_position_preferences', 'DELETE'),
  'authenticated users cannot bypass position ownership through direct deletes'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.remove_athlete_from_team(uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot remove athletes'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    select public.update_athlete_as_admin(
      requested_athlete_id => '93000000-0000-4000-8000-000000000001',
      athlete_full_name => 'Cadastro Atualizado',
      athlete_preferred_name => 'Atualizado',
      athlete_shirt_number => 8,
      athlete_birth_date => date '1993-03-03',
      athlete_phone_e164 => '+5511999990202',
      athlete_email => 'UPDATED@EXAMPLE.TEST',
      athlete_public_profile => false,
      position_codes => array['ALA', 'MID'],
      team_notes => 'Observação atualizada'
    )
  $$,
  'owner can fully edit an unclaimed athlete'
);
select is(
  (select full_name from public.athletes where id = '93000000-0000-4000-8000-000000000001'),
  'Cadastro Atualizado',
  'unclaimed athlete identity is updated'
);
select is(
  (select email::text from public.athlete_private where athlete_id = '93000000-0000-4000-8000-000000000001'),
  'updated@example.test',
  'unclaimed athlete private data is normalized and updated'
);
select is(
  (
    select string_agg(position_code, ',' order by priority)
    from public.athlete_position_preferences
    where athlete_id = '93000000-0000-4000-8000-000000000001'
  ),
  'ALA,MID',
  'unclaimed athlete positions are replaced in priority order'
);
select lives_ok(
  $$
    select public.update_athlete_as_admin(
      requested_athlete_id => '93000000-0000-4000-8000-000000000002',
      athlete_shirt_number => 11,
      team_notes => 'Somente dado interno'
    )
  $$,
  'owner can update team fields for a claimed athlete'
);
select is(
  (select shirt_number from public.athletes where id = '93000000-0000-4000-8000-000000000002'),
  11::smallint,
  'claimed athlete shirt number is updated'
);
select is(
  (select notes from public.athlete_private where athlete_id = '93000000-0000-4000-8000-000000000002'),
  'Somente dado interno',
  'claimed athlete team notes are updated'
);
select throws_ok(
  $$
    select public.update_athlete_as_admin(
      requested_athlete_id => '93000000-0000-4000-8000-000000000002',
      athlete_full_name => 'Nome Manipulado'
    )
  $$,
  '55000',
  null,
  'team admin cannot alter player-owned identity fields'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);

select throws_ok(
  $$
    select public.update_athlete_as_admin(
      requested_athlete_id => '93000000-0000-4000-8000-000000000001',
      athlete_shirt_number => 9
    )
  $$,
  '42501',
  null,
  'manager cannot perform identity-level athlete edits'
);
select throws_ok(
  $$
    select public.remove_athlete_from_team('93000000-0000-4000-8000-000000000001')
  $$,
  '42501',
  null,
  'manager cannot terminate an athlete relationship'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);

select is(
  (
    select removal_outcome
    from public.remove_athlete_from_team('93000000-0000-4000-8000-000000000001')
  ),
  'deleted',
  'admin physically deletes an athlete without sporting history'
);
select is(
  (select count(*) from public.athletes where id = '93000000-0000-4000-8000-000000000001'),
  0::bigint,
  'unused athlete record no longer exists'
);
select is(
  (
    select removal_outcome
    from public.remove_athlete_from_team('93000000-0000-4000-8000-000000000002')
  ),
  'archived',
  'admin archives an athlete with sporting history'
);
select is(
  (select count(*) from public.athletes where id = '93000000-0000-4000-8000-000000000002'),
  1::bigint,
  'historical athlete record is preserved'
);
select is(
  (select user_id from public.athletes where id = '93000000-0000-4000-8000-000000000002'),
  null::uuid,
  'archived team relationship is detached from the personal identity'
);
select ok(
  (
    select removed_at is not null and status = 'inactive' and public_profile = false
    from public.athletes
    where id = '93000000-0000-4000-8000-000000000002'
  ),
  'archived athlete is inactive, private and visibly marked as removed'
);
select is(
  (select count(*) from public.athlete_private where athlete_id = '93000000-0000-4000-8000-000000000002'),
  0::bigint,
  'archiving clears team-held personal data'
);
select is(
  (select count(*) from public.athlete_position_preferences where athlete_id = '93000000-0000-4000-8000-000000000002'),
  0::bigint,
  'archiving clears current position preferences'
);
select is(
  (
    select count(*)
    from public.event_attendance
    where athlete_id = '93000000-0000-4000-8000-000000000002'
      and event_id = '94000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'archiving removes future event calls'
);
select is(
  (
    select count(*)
    from public.event_attendance
    where athlete_id = '93000000-0000-4000-8000-000000000002'
      and event_id = '94000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'archiving preserves historical attendance'
);
select is(
  (select count(*) from public.match_incidents where athlete_id = '93000000-0000-4000-8000-000000000002'),
  1::bigint,
  'archiving preserves goals and match history'
);

reset role;

select is(
  (select count(*) from public.player_profiles where user_id = '91000000-0000-4000-8000-000000000004'),
  1::bigint,
  'removing a team relationship never deletes the global player profile'
);
select is(
  (
    select count(*)
    from public.athletes
    where team_id = '92000000-0000-4000-8000-000000000002'
      and user_id = '91000000-0000-4000-8000-000000000004'
  ),
  1::bigint,
  'removing one relationship leaves the same player in other teams'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$
    select public.set_athlete_availability(
      '93000000-0000-4000-8000-000000000002',
      'active'
    )
  $$,
  '55000',
  null,
  'an archived relationship cannot be reactivated'
);
select is(
  (
    select count(*)
    from public.audit_logs
    where action = 'athletes.relationship_removed'
      and team_id = '92000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'every relationship removal is explicitly audited'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000004', true);

select is(
  (select count(*) from public.list_my_player_team_links()),
  1::bigint,
  'player portal omits the removed team but keeps other team relationships'
);
select is(
  (select team_slug from public.list_my_player_team_links()),
  'lifecycle-beta',
  'player portal keeps the unaffected team relationship'
);

select * from finish();
rollback;
