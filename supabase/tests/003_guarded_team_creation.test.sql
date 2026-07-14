begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

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
values (
  '00000000-0000-0000-0000-000000000000',
  'f1111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'team-creator@example.test',
  '',
  now(),
  '{}'::jsonb,
  '{"display_name":"Team Creator"}'::jsonb,
  now(),
  now(),
  '', '', '', ''
);

select ok(
  not has_table_privilege('authenticated', 'public.teams', 'INSERT'),
  'authenticated clients cannot insert teams directly'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_team_for_current_user(text,text,public.sport_format)',
    'EXECUTE'
  ),
  'authenticated clients can call the guarded team creation RPC'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1111111-1111-4111-8111-111111111111', true);

select is(
  public.create_team_for_current_user('Time Protegido', 'time-protegido', 'society'),
  'time-protegido',
  'a verified user can create a valid team'
);
select is(
  (
    select role::text || ':' || status::text
    from public.team_memberships tm
    join public.teams t on t.id = tm.team_id
    where t.slug = 'time-protegido'
      and tm.user_id = 'f1111111-1111-4111-8111-111111111111'
  ),
  'owner:active',
  'team creation atomically establishes the owner membership'
);
select throws_ok(
  $$
    select public.create_team_for_current_user(
      'Segundo Time Imediato',
      'segundo-time-imediato',
      'futsal'
    )
  $$,
  '54000',
  null,
  'parallel or rapid team creation is rate limited in the database'
);
select throws_ok(
  $$
    select public.create_team_for_current_user(
      'Time Inválido',
      '../admin',
      'society'
    )
  $$,
  '22023',
  null,
  'unsafe public slugs are rejected in the database RPC'
);

select * from finish();
rollback;
