begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(19);

select has_column(
  'public',
  'team_media',
  'is_featured',
  'team media records whether a gallery photo is featured'
);
select has_index(
  'public',
  'team_media',
  'team_media_one_featured_gallery_idx',
  'one featured gallery photo is enforced per team'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.set_team_featured_media(uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot choose a featured photo'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.set_team_featured_media(uuid)',
    'EXECUTE'
  ),
  'authenticated owners and admins can call the guarded workflow'
);
select ok(
  not has_table_privilege('authenticated', 'public.team_media', 'UPDATE'),
  'authenticated users cannot bypass the featured-photo workflow'
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
    'a1100000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'feature-owner@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Feature Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1100000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'feature-manager@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Feature Manager"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1100000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'feature-outsider@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Feature Outsider"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, default_sport_format, created_by)
values (
  'a1200000-0000-4000-8000-000000000001',
  'Feature Alpha',
  'feature-alpha',
  'society',
  'a1100000-0000-4000-8000-000000000001'
);

insert into public.team_memberships (team_id, user_id, role, status)
values (
  'a1200000-0000-4000-8000-000000000001',
  'a1100000-0000-4000-8000-000000000002',
  'manager',
  'active'
);

create temporary table featured_state (
  key text primary key,
  value uuid not null
);
grant select, insert, update on table pg_temp.featured_state to authenticated;
grant select on table pg_temp.featured_state to anon;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into pg_temp.featured_state (key, value)
    values (
      'first',
      public.add_team_gallery_media(
        'a1200000-0000-4000-8000-000000000001',
        'a1200000-0000-4000-8000-000000000001/gallery/a1300000-0000-4000-8000-000000000001.jpg',
        'Primeira foto'
      )
    )
  $$,
  'owner can add the first gallery photo'
);
select is(
  (
    select is_featured
    from public.team_media
    where id = (select value from pg_temp.featured_state where key = 'first')
  ),
  true,
  'the first gallery photo becomes featured automatically'
);
select lives_ok(
  $$
    insert into pg_temp.featured_state (key, value)
    values (
      'second',
      public.add_team_gallery_media(
        'a1200000-0000-4000-8000-000000000001',
        'a1200000-0000-4000-8000-000000000001/gallery/a1300000-0000-4000-8000-000000000002.webp',
        'Segunda foto'
      )
    )
  $$,
  'owner can add another gallery photo'
);
select is(
  (
    select count(*)
    from public.team_media
    where team_id = 'a1200000-0000-4000-8000-000000000001'
      and kind = 'gallery'
      and is_featured = true
  ),
  1::bigint,
  'adding more photos keeps exactly one featured image'
);

select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$
    select public.set_team_featured_media(
      (select value from pg_temp.featured_state where key = 'second')
    )
  $$,
  '42501',
  null,
  'manager cannot choose the public gallery highlight'
);

select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$
    select public.set_team_featured_media(
      (select value from pg_temp.featured_state where key = 'second')
    )
  $$,
  '42501',
  null,
  'outsider cannot choose another team highlight'
);

select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$
    select public.set_team_featured_media(
      (select value from pg_temp.featured_state where key = 'second')
    )
  $$,
  'owner can select a different featured photo'
);
select is(
  (
    select is_featured
    from public.team_media
    where id = (select value from pg_temp.featured_state where key = 'second')
  ),
  true,
  'selected photo is marked as featured'
);
select is(
  (
    select is_featured
    from public.team_media
    where id = (select value from pg_temp.featured_state where key = 'first')
  ),
  false,
  'previous featured photo returns to the regular grid'
);

reset role;
set local role anon;
select is(
  (
    select id
    from public.public_team_media
    where team_slug = 'feature-alpha'
      and is_featured = true
  ),
  (select value from pg_temp.featured_state where key = 'second'),
  'safe public gallery exposes the selected highlight'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-000000000001', true);
select is(
  (
    select count(*)
    from public.audit_logs
    where team_id = 'a1200000-0000-4000-8000-000000000001'
      and action = 'team_media.feature'
  ),
  1::bigint,
  'featured photo selection is audited'
);
select lives_ok(
  $$
    select public.remove_team_media(
      (select value from pg_temp.featured_state where key = 'second')
    )
  $$,
  'owner can remove the featured photo'
);
select is(
  (
    select is_featured
    from public.team_media
    where id = (select value from pg_temp.featured_state where key = 'first')
  ),
  true,
  'another photo is promoted automatically after featured removal'
);

reset role;
set local role anon;
select is(
  (
    select count(*)
    from public.public_team_media
    where team_slug = 'feature-alpha'
      and is_featured = true
  ),
  1::bigint,
  'public gallery continues with exactly one highlight after removal'
);

select * from finish();
rollback;
