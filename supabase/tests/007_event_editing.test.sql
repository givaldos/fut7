begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(19);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'editing-owner@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Editing Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'editing-outsider@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Editing Outsider"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, default_sport_format, created_by)
values
  (
    '72000000-0000-4000-8000-000000000001',
    'Editing Alpha',
    'editing-alpha',
    'society',
    '71000000-0000-4000-8000-000000000001'
  ),
  (
    '72000000-0000-4000-8000-000000000002',
    'Editing Beta',
    'editing-beta',
    'futsal',
    '71000000-0000-4000-8000-000000000002'
  );

insert into public.athletes (
  id, team_id, full_name, status, registration_source
)
values (
  '73000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001',
  'Atleta da edição',
  'active',
  'admin'
);

select ok(
  not has_table_privilege('authenticated', 'public.events', 'UPDATE'),
  'authenticated users cannot bypass the guarded event editing workflow'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.update_event_as_staff(uuid,uuid,text,text,public.event_kind,public.organization_mode,public.sport_format,timestamptz,integer,integer,text,text,text)',
    'EXECUTE'
  ),
  'authenticated staff can call the guarded event editing workflow'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    select public.create_event_as_staff(
      '72000000-0000-4000-8000-000000000001',
      'Racha original',
      'weekly_match',
      'split_teams',
      'society',
      now() + interval '7 days',
      90,
      120,
      4,
      null,
      'Arena original',
      'Rua original, 10'
    )
  $$,
  'team owner can create the recurring series used by editing tests'
);
select is(
  (
    select count(*)
    from public.events e
    where e.team_id = '72000000-0000-4000-8000-000000000001'
  ),
  4::bigint,
  'the series has four materialized occurrences'
);
select is(
  (
    select array_agg(e.series_position order by e.series_position)
    from public.events e
    where e.team_id = '72000000-0000-4000-8000-000000000001'
  ),
  array[1, 2, 3, 4]::smallint[],
  'new recurring events receive a stable one-based position'
);

select lives_ok(
  $$
    select public.set_event_attendance_as_staff(
      (
        select e.id
        from public.events e
        where e.team_id = '72000000-0000-4000-8000-000000000001'
          and e.series_position = 2
      ),
      '73000000-0000-4000-8000-000000000001',
      'confirmed'
    )
  $$,
  'an athlete can confirm the occurrence before it is edited'
);
select is(
  public.update_event_as_staff(
    '72000000-0000-4000-8000-000000000001',
    (
      select e.id
      from public.events e
      where e.team_id = '72000000-0000-4000-8000-000000000001'
        and e.series_position = 2
    ),
    'single_event',
    'Racha em horário especial',
    'weekly_match',
    'split_teams',
    'society',
    (
      select e.starts_at + interval '2 hours'
      from public.events e
      where e.team_id = '72000000-0000-4000-8000-000000000001'
        and e.series_position = 2
    ),
    120,
    60,
    'Convidados',
    'Arena especial',
    'Rua especial, 20'
  ),
  1,
  'single-event editing updates exactly one occurrence'
);
select ok(
  (
    select e.is_series_exception
      and e.title = 'Racha em horário especial'
    from public.events e
    where e.team_id = '72000000-0000-4000-8000-000000000001'
      and e.series_position = 2
  ),
  'an individually edited occurrence is marked as a series exception'
);
select is(
  (
    select count(*)
    from public.events e
    where e.team_id = '72000000-0000-4000-8000-000000000001'
      and e.title = 'Racha original'
  ),
  3::bigint,
  'single-event editing leaves the other occurrences unchanged'
);
select is(
  (
    select ea.status
    from public.event_attendance ea
    join public.events e on e.id = ea.event_id
    where e.team_id = '72000000-0000-4000-8000-000000000001'
      and e.series_position = 2
      and ea.athlete_id = '73000000-0000-4000-8000-000000000001'
  ),
  'confirmed'::public.attendance_status,
  'single-event editing preserves attendance responses'
);

select is(
  public.update_event_as_staff(
    '72000000-0000-4000-8000-000000000001',
    (
      select e.id
      from public.events e
      where e.team_id = '72000000-0000-4000-8000-000000000001'
        and e.series_position = 1
    ),
    'this_and_future',
    'Racha atualizado',
    'weekly_match',
    'split_teams',
    'society',
    (
      select e.starts_at + interval '1 day'
      from public.events e
      where e.team_id = '72000000-0000-4000-8000-000000000001'
        and e.series_position = 1
    ),
    75,
    120,
    null,
    'Arena atualizada',
    'Rua atualizada, 30'
  ),
  3,
  'this-and-future editing updates the selected and non-exception future occurrences'
);
select is(
  (
    select string_agg(e.title, '|' order by e.series_position)
    from public.events e
    where e.team_id = '72000000-0000-4000-8000-000000000001'
  ),
  'Racha atualizado|Racha em horário especial|Racha atualizado|Racha atualizado',
  'future editing preserves a previously customized occurrence'
);
select ok(
  (
    select third.starts_at = first.starts_at + interval '2 weeks'
    from public.events first
    join public.events third on third.series_id = first.series_id
    where first.team_id = '72000000-0000-4000-8000-000000000001'
      and first.series_position = 1
      and third.series_position = 3
  ),
  'future occurrences are recalculated weekly from the selected new date and time'
);
select ok(
  (
    select e.is_series_exception
    from public.events e
    where e.team_id = '72000000-0000-4000-8000-000000000001'
      and e.series_position = 2
  ),
  'the protected occurrence remains marked as an exception'
);
select is(
  (
    select count(*)
    from public.event_attendance ea
    where ea.team_id = '72000000-0000-4000-8000-000000000001'
  ),
  4::bigint,
  'bulk editing preserves every occurrence call list'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$
    select public.update_event_as_staff(
      '72000000-0000-4000-8000-000000000001',
      null,
      'single_event',
      'Tentativa externa',
      'friendly',
      'single_squad',
      'society',
      now() + interval '10 days',
      90,
      120
    )
  $$,
  '42501',
  null,
  'staff from another tenant cannot edit the event'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$
    select public.update_event_as_staff(
      '72000000-0000-4000-8000-000000000001',
      (
        select e.id
        from public.events e
        where e.team_id = '72000000-0000-4000-8000-000000000001'
          and e.series_position = 1
      ),
      'single_event',
      'Data inválida',
      'weekly_match',
      'split_teams',
      'society',
      now() - interval '1 day',
      90,
      120
    )
  $$,
  '22023',
  null,
  'an event cannot be moved into the past'
);
select is(
  (
    select count(*)
    from public.audit_logs audit
    where audit.team_id = '72000000-0000-4000-8000-000000000001'
      and audit.action = 'events.update'
  ),
  4::bigint,
  'every changed event occurrence is captured by the audit trigger'
);
select is(
  (
    select es.title
    from public.event_series es
    where es.team_id = '72000000-0000-4000-8000-000000000001'
  ),
  'Racha atualizado',
  'future editing updates the active series defaults'
);

select * from finish();
rollback;
