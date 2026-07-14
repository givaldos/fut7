begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(25);

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
    'd1111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated', 'plg-owner@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"PLG Owner"}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd2222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated', 'plg-owner-b@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"PLG Owner B"}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3333333-3333-4333-8333-333333333333',
    'authenticated', 'authenticated', 'plg-admin@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"PLG Admin"}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd4444444-4444-4444-8444-444444444444',
    'authenticated', 'authenticated', 'plg-invitee@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"PLG Invitee"}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd5555555-5555-4555-8555-555555555555',
    'authenticated', 'authenticated', 'plg-outsider@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"PLG Outsider"}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd6666666-6666-4666-8666-666666666666',
    'authenticated', 'authenticated', 'plg-unverified@example.test', '', null,
    '{}'::jsonb, '{"display_name":"PLG Unverified"}'::jsonb, now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, created_by)
values
  (
    'e1111111-1111-4111-8111-111111111111',
    'PLG Alpha',
    'plg-alpha',
    'd1111111-1111-4111-8111-111111111111'
  ),
  (
    'e2222222-2222-4222-8222-222222222222',
    'PLG Beta',
    'plg-beta',
    'd2222222-2222-4222-8222-222222222222'
  );

insert into public.team_memberships (team_id, user_id, role, status, invited_by)
values (
  'e1111111-1111-4111-8111-111111111111',
  'd3333333-3333-4333-8333-333333333333',
  'admin',
  'active',
  'd1111111-1111-4111-8111-111111111111'
);

create temporary table invitation_state (
  kind text primary key,
  invitation_id uuid not null,
  invite_token text not null
);
grant select, insert, update on table pg_temp.invitation_state to authenticated, service_role;

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'team_invitations'
  ),
  'team invitations enforce RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.team_invitations', 'INSERT'),
  'authenticated users cannot insert invitation rows directly'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_team_invitation(uuid,text,public.team_role)',
    'EXECUTE'
  ),
  'authenticated users can call the guarded create invitation RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_team_invitation_preview(text)',
    'EXECUTE'
  ),
  'anon cannot inspect invitation previews directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.get_team_invitation_preview(text)',
    'EXECUTE'
  ),
  'the trusted server can inspect a minimal invitation preview'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1111111-1111-4111-8111-111111111111', true);

select lives_ok(
  $$
    insert into pg_temp.invitation_state (kind, invitation_id, invite_token)
    select 'invitee', invitation_id, invite_token
    from public.create_team_invitation(
      'e1111111-1111-4111-8111-111111111111',
      'PLG-INVITEE@example.test',
      'manager'
    )
  $$,
  'owner can create a manager invitation'
);
select ok(
  (select invite_token ~ '^[a-f0-9]{64}$' from pg_temp.invitation_state where kind = 'invitee'),
  'the returned invitation token has 256 bits of URL-safe entropy'
);
select is(
  (
    select encode(i.token_hash, 'hex')
    from public.team_invitations i
    join pg_temp.invitation_state s on s.invitation_id = i.id
    where s.kind = 'invitee'
  ),
  (
    select encode(extensions.digest(s.invite_token, 'sha256'), 'hex')
    from pg_temp.invitation_state s
    where s.kind = 'invitee'
  ),
  'only the SHA-256 token digest is persisted'
);
select throws_ok(
  $$
    select *
    from public.create_team_invitation(
      'e2222222-2222-4222-8222-222222222222',
      'cross-tenant@example.test',
      'manager'
    )
  $$,
  '42501',
  null,
  'an owner cannot create an invitation for another tenant'
);
select lives_ok(
  $$
    select *
    from public.create_team_invitation(
      'e1111111-1111-4111-8111-111111111111',
      'future-admin@example.test',
      'admin'
    )
  $$,
  'an owner can invite another administrator'
);
select lives_ok(
  $$
    insert into pg_temp.invitation_state (kind, invitation_id, invite_token)
    select 'unverified', invitation_id, invite_token
    from public.create_team_invitation(
      'e1111111-1111-4111-8111-111111111111',
      'plg-unverified@example.test',
      'manager'
    )
  $$,
  'an invitation can be prepared before the recipient confirms an account'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd3333333-3333-4333-8333-333333333333', true);

select lives_ok(
  $$
    insert into pg_temp.invitation_state (kind, invitation_id, invite_token)
    select 'outsider', invitation_id, invite_token
    from public.create_team_invitation(
      'e1111111-1111-4111-8111-111111111111',
      'plg-outsider@example.test',
      'manager'
    )
  $$,
  'an administrator can invite a manager'
);
select throws_ok(
  $$
    select *
    from public.create_team_invitation(
      'e1111111-1111-4111-8111-111111111111',
      'admin-escalation@example.test',
      'admin'
    )
  $$,
  '42501',
  null,
  'an administrator cannot grant the administrator role'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd4444444-4444-4444-8444-444444444444', true);

select is(
  (select count(*) from public.list_my_team_invitations()),
  1::bigint,
  'a verified recipient sees their pending invitation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd5555555-5555-4555-8555-555555555555', true);

select is(
  (select count(*) from public.list_my_team_invitations()),
  1::bigint,
  'invitation discovery is isolated to the authenticated email'
);

reset role;
set local role service_role;

select is(
  (
    select count(*)
    from public.get_team_invitation_preview(
      (select invite_token from pg_temp.invitation_state where kind = 'invitee')
    )
  ),
  1::bigint,
  'the server can preview an active invitation from its raw token'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd4444444-4444-4444-8444-444444444444', true);

select lives_ok(
  $$
    select public.respond_to_team_invitation(
      (select invitation_id from pg_temp.invitation_state where kind = 'invitee'),
      'accept'
    )
  $$,
  'the verified recipient can explicitly accept the invitation'
);
select is(
  (
    select role::text || ':' || status::text
    from public.team_memberships
    where team_id = 'e1111111-1111-4111-8111-111111111111'
      and user_id = 'd4444444-4444-4444-8444-444444444444'
  ),
  'manager:active',
  'acceptance atomically activates the requested membership role'
);
select is(
  (select count(*) from public.list_my_team_invitations()),
  0::bigint,
  'accepted invitations leave the pending inbox'
);

reset role;
set local role service_role;

select is(
  (
    select count(*)
    from public.get_team_invitation_preview(
      (select invite_token from pg_temp.invitation_state where kind = 'invitee')
    )
  ),
  0::bigint,
  'an accepted invitation token no longer produces a preview'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd4444444-4444-4444-8444-444444444444', true);

select throws_ok(
  $$
    select public.respond_to_team_invitation(
      (select invitation_id from pg_temp.invitation_state where kind = 'invitee'),
      'accept'
    )
  $$,
  '22023',
  null,
  'an accepted invitation cannot be reused'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd5555555-5555-4555-8555-555555555555', true);

select lives_ok(
  $$
    select public.respond_to_team_invitation(
      (select invitation_id from pg_temp.invitation_state where kind = 'outsider'),
      'decline'
    )
  $$,
  'the recipient can explicitly decline an invitation'
);
select is(
  (
    select count(*)
    from public.team_memberships
    where user_id = 'd5555555-5555-4555-8555-555555555555'
  ),
  0::bigint,
  'declining does not create a team membership'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd6666666-6666-4666-8666-666666666666', true);

select is(
  (select count(*) from public.list_my_team_invitations()),
  0::bigint,
  'an unverified account cannot discover invitations by email'
);
select throws_ok(
  $$
    select public.respond_to_team_invitation(
      (select invitation_id from pg_temp.invitation_state where kind = 'unverified'),
      'accept'
    )
  $$,
  '42501',
  null,
  'an unverified account cannot accept an invitation'
);

select * from finish();
rollback;
