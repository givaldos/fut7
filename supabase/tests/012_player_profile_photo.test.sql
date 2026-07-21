begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(23);

select is(
  (select public from storage.buckets where id = 'athlete_avatars'),
  false,
  'athlete avatars remain in a private bucket'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.replace_my_player_photo(text)',
    'EXECUTE'
  ),
  'anonymous users cannot replace a player photo'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.remove_my_player_photo()',
    'EXECUTE'
  ),
  'anonymous users cannot remove a player photo'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.replace_my_player_photo(text)',
    'EXECUTE'
  ),
  'authenticated players can call the guarded replace workflow'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.remove_my_player_photo()',
    'EXECUTE'
  ),
  'authenticated players can call the guarded remove workflow'
);
select ok(
  not has_table_privilege('authenticated', 'public.player_profiles', 'UPDATE'),
  'authenticated users cannot bypass the player photo workflow'
);

insert into auth.users (
  instance_id, id, aud, role, email, phone, encrypted_password,
  email_confirmed_at, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'b1100000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'photo-owner@example.test', null, '',
    now(), null, '{}'::jsonb, '{"display_name":"Photo Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b1100000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', null, '+5511999991202', '',
    null, now(), '{"provider":"phone","providers":["phone"]}'::jsonb,
    '{"display_name":"Photo Player"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b1100000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', null, '+5511999991203', '',
    null, now(), '{"provider":"phone","providers":["phone"]}'::jsonb,
    '{"display_name":"Photo Outsider"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.teams (
  id, name, slug, default_sport_format, is_public, created_by
)
values (
  'b1200000-0000-4000-8000-000000000001',
  'Photo Alpha',
  'photo-alpha',
  'society',
  true,
  'b1100000-0000-4000-8000-000000000001'
);

insert into public.player_profiles (
  user_id, handle, display_name, preferred_name, is_public, phone_verified_at
)
values (
  'b1100000-0000-4000-8000-000000000002',
  'photo-player',
  'Photo Player',
  'Player',
  true,
  now()
);

insert into public.athletes (
  id, team_id, user_id, full_name, preferred_name, shirt_number,
  status, registration_source, public_profile, created_by
)
values (
  'b1300000-0000-4000-8000-000000000001',
  'b1200000-0000-4000-8000-000000000001',
  'b1100000-0000-4000-8000-000000000002',
  'Photo Player',
  'Player',
  10,
  'active',
  'public_form',
  false,
  'b1100000-0000-4000-8000-000000000002'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'athlete_avatars',
      'b1100000-0000-4000-8000-000000000002/profile/b1400000-0000-4000-8000-000000000001.webp'
    )
  $$,
  'player can upload an object under their own profile path'
);
select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'athlete_avatars'
      and name = 'b1100000-0000-4000-8000-000000000002/profile/b1400000-0000-4000-8000-000000000001.webp'
  ),
  1::bigint,
  'player can read their own private profile object'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'athlete_avatars',
      'b1100000-0000-4000-8000-000000000003/profile/b1400000-0000-4000-8000-000000000002.webp'
    )
  $$,
  '42501',
  null,
  'player cannot upload into another user folder'
);
select throws_ok(
  $$
    select public.replace_my_player_photo(
      'b1100000-0000-4000-8000-000000000003/profile/b1400000-0000-4000-8000-000000000002.webp'
    )
  $$,
  '22023',
  null,
  'replace workflow rejects a path owned by another user'
);
select lives_ok(
  $$
    select public.replace_my_player_photo(
      'b1100000-0000-4000-8000-000000000002/profile/b1400000-0000-4000-8000-000000000001.webp'
    )
  $$,
  'player can publish their own validated profile photo'
);
select is(
  (
    select photo_path
    from public.player_profiles
    where user_id = 'b1100000-0000-4000-8000-000000000002'
  ),
  'b1100000-0000-4000-8000-000000000002/profile/b1400000-0000-4000-8000-000000000001.webp',
  'guarded workflow stores the validated private path'
);

reset role;
set local role anon;
select is(
  (
    select photo_path
    from public.public_player_directory
    where handle = 'photo-player'
  ),
  'b1100000-0000-4000-8000-000000000002/profile/b1400000-0000-4000-8000-000000000001.webp',
  'public player directory exposes the safe photo path after consent'
);
select is(
  (
    select photo_path
    from public.public_athlete_directory
    where team_slug = 'photo-alpha'
  ),
  'b1100000-0000-4000-8000-000000000002/profile/b1400000-0000-4000-8000-000000000001.webp',
  'public BID uses the player-owned photo'
);
select is(
  (
    select player_handle
    from public.public_athlete_directory
    where team_slug = 'photo-alpha'
  ),
  'photo-player',
  'public BID links a claimed athlete to the public player profile'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000003', true);
select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'athlete_avatars'
      and name = 'b1100000-0000-4000-8000-000000000002/profile/b1400000-0000-4000-8000-000000000001.webp'
  ),
  0::bigint,
  'another authenticated user cannot read the private object'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'athlete_avatars',
      'b1100000-0000-4000-8000-000000000002/profile/b1400000-0000-4000-8000-000000000003.webp'
    )
  $$,
  '42501',
  null,
  'another authenticated user cannot write into the player folder'
);

select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000002', true);
select is(
  public.remove_my_player_photo(),
  'b1100000-0000-4000-8000-000000000002/profile/b1400000-0000-4000-8000-000000000001.webp',
  'remove workflow returns the old path for object cleanup'
);
select is(
  (
    select photo_path
    from public.player_profiles
    where user_id = 'b1100000-0000-4000-8000-000000000002'
  ),
  null,
  'remove workflow clears the player photo reference'
);

reset role;
set local role anon;
select is(
  (
    select photo_path
    from public.public_player_directory
    where handle = 'photo-player'
  ),
  null,
  'public player profile stops exposing a removed photo'
);
select is(
  (
    select photo_path
    from public.public_athlete_directory
    where team_slug = 'photo-alpha'
  ),
  null,
  'public BID stops exposing a removed photo'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1100000-0000-4000-8000-000000000002', true);
select ok(
  exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'athlete_avatars_delete_own_profile'
      and cmd = 'DELETE'
  ),
  'storage API has a player-scoped cleanup policy'
);

reset role;
select is(
  (
    select count(*)
    from public.audit_logs
    where actor_id = 'b1100000-0000-4000-8000-000000000002'
      and action in (
        'player_profiles.photo_replace',
        'player_profiles.photo_remove'
      )
  ),
  2::bigint,
  'photo replacements and removals are audited'
);

select * from finish();
rollback;
