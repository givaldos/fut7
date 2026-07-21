begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(29);

select has_table('public', 'team_public_profiles', 'team public profile table exists');
select has_table('public', 'team_media', 'team media metadata table exists');
select is(
  (select public from storage.buckets where id = 'team_media'),
  false,
  'team media bucket remains private'
);
select ok(
  has_function_privilege(
    'authenticated',
    'private.try_uuid(text)',
    'EXECUTE'
  ),
  'authenticated storage policies can parse team UUID path segments'
);
select ok(
  not has_function_privilege(
    'anon',
    'private.try_uuid(text)',
    'EXECUTE'
  ),
  'anonymous callers cannot execute the private UUID parser'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'social-owner@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Social Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'social-manager@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Social Manager"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'social-outsider@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Social Outsider"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.teams (
  id, name, slug, default_sport_format, created_by
) values (
  '92000000-0000-4000-8000-000000000001',
  'Social Alpha',
  'social-alpha',
  'society',
  '91000000-0000-4000-8000-000000000001'
);

insert into public.team_memberships (team_id, user_id, role, status)
values (
  '92000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000002',
  'manager',
  'active'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    select public.update_team_social_settings(
      '92000000-0000-4000-8000-000000000001',
      'social-alpha',
      'Social Alpha FC',
      'society',
      'America/Sao_Paulo',
      true,
      'Um time feito de futebol e amizade.',
      'https://instagram.com/socialalpha',
      '', '', '', 'https://social.example.test'
    )
  $$,
  'owner can atomically publish social settings'
);
select is(
  (select about from public.team_public_profiles where team_id = '92000000-0000-4000-8000-000000000001'),
  'Um time feito de futebol e amizade.',
  'social biography is stored'
);
select lives_ok(
  $$
    select public.replace_team_identity_media(
      '92000000-0000-4000-8000-000000000001',
      'logo',
      '92000000-0000-4000-8000-000000000001/logo/93000000-0000-4000-8000-000000000001.webp',
      'Escudo do Social Alpha'
    )
  $$,
  'owner can register a logo upload'
);
select lives_ok(
  $$
    select public.add_team_gallery_media(
      '92000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001/gallery/93000000-0000-4000-8000-000000000002.jpg',
      'Primeira foto'
    )
  $$,
  'owner can register a gallery upload'
);
select is(
  (select count(*) from public.team_media where team_id = '92000000-0000-4000-8000-000000000001'),
  2::bigint,
  'logo and gallery metadata are registered'
);
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'team_media',
      '92000000-0000-4000-8000-000000000001/gallery/95000000-0000-4000-8000-000000000001.jpg'
    )
  $$,
  'owner can upload an object under the authorized team path'
);

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*) from public.team_public_profiles),
  1::bigint,
  'manager can read team public settings'
);
select lives_ok(
  $$
    update public.team_public_profiles
    set about = 'Mudança indevida'
    where team_id = '92000000-0000-4000-8000-000000000001'
  $$,
  'manager update is safely filtered by RLS'
);
select is(
  (select about from public.team_public_profiles where team_id = '92000000-0000-4000-8000-000000000001'),
  'Um time feito de futebol e amizade.',
  'manager cannot edit public settings'
);
select throws_ok(
  $$
    select public.add_team_gallery_media(
      '92000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001/gallery/93000000-0000-4000-8000-000000000003.jpg',
      'Tentativa do manager'
    )
  $$,
  '42501',
  null,
  'manager cannot register team media'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'team_media',
      '92000000-0000-4000-8000-000000000001/gallery/95000000-0000-4000-8000-000000000002.jpg'
    )
  $$,
  '42501',
  null,
  'manager cannot upload team media objects'
);

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
select is(
  (select count(*) from public.team_public_profiles),
  0::bigint,
  'outsider cannot read private settings rows'
);
select throws_ok(
  $$
    select public.replace_team_identity_media(
      '92000000-0000-4000-8000-000000000001',
      'cover',
      '92000000-0000-4000-8000-000000000001/cover/93000000-0000-4000-8000-000000000004.jpg',
      'Tentativa externa'
    )
  $$,
  '42501',
  null,
  'outsider cannot replace team media'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'team_media',
      '92000000-0000-4000-8000-000000000001/gallery/95000000-0000-4000-8000-000000000003.jpg'
    )
  $$,
  '42501',
  null,
  'outsider cannot upload team media objects'
);

reset role;
set local role anon;
select is(
  (select about from public.public_team_directory where slug = 'social-alpha'),
  'Um time feito de futebol e amizade.',
  'safe public directory exposes the team biography'
);
select is(
  (select logo_path from public.public_team_directory where slug = 'social-alpha'),
  '92000000-0000-4000-8000-000000000001/logo/93000000-0000-4000-8000-000000000001.webp',
  'safe public directory exposes only registered logo metadata'
);
select is(
  (select count(*) from public.public_team_media where team_slug = 'social-alpha'),
  1::bigint,
  'safe public gallery exposes registered team photos'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'team_media',
      'not-a-team/gallery/95000000-0000-4000-8000-000000000004.jpg'
    )
  $$,
  '42501',
  null,
  'malformed storage paths fail closed without exposing a cast error'
);
select lives_ok(
  $$
    select public.add_team_gallery_media(
      '92000000-0000-4000-8000-000000000001',
      format(
        '92000000-0000-4000-8000-000000000001/gallery/94000000-0000-4000-8000-%s.jpg',
        lpad(series::text, 12, '0')
      ),
      format('Foto %s', series)
    )
    from generate_series(2, 13) as series
  $$,
  'owner can fill the gallery to its serialized limit'
);
select is(
  (select count(*) from public.team_media where team_id = '92000000-0000-4000-8000-000000000001' and kind = 'gallery'),
  13::bigint,
  'gallery accepts thirteen photos'
);
select throws_ok(
  $$
    select public.add_team_gallery_media(
      '92000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001/gallery/94000000-0000-4000-8000-000000000014.jpg',
      'Foto acima do limite'
    )
  $$,
  '54000',
  null,
  'gallery rejects the fourteenth photo'
);
select lives_ok(
  $$
    select public.remove_team_media(
      (
        select id from public.team_media
        where storage_path = '92000000-0000-4000-8000-000000000001/gallery/93000000-0000-4000-8000-000000000002.jpg'
      )
    )
  $$,
  'owner can remove gallery metadata'
);
select is(
  (select count(*) from public.team_media where team_id = '92000000-0000-4000-8000-000000000001' and kind = 'gallery'),
  12::bigint,
  'removing a photo frees a gallery slot'
);

reset role;
set local role anon;
select is(
  (select count(*) from public.public_team_media where team_slug = 'social-alpha'),
  12::bigint,
  'public gallery reflects authorized removals'
);

select * from finish();
rollback;
