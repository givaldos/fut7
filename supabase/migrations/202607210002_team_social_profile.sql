-- Social team profile and media gallery.
-- Media bytes remain in a private bucket; only metadata published by the safe
-- public views is eligible for short-lived signed URLs on the server.

create table public.team_public_profiles (
  team_id uuid primary key references public.teams (id) on delete cascade,
  about text check (about is null or char_length(about) <= 1600),
  instagram_url text check (
    instagram_url is null
    or (char_length(instagram_url) <= 300 and instagram_url ~ '^https://')
  ),
  facebook_url text check (
    facebook_url is null
    or (char_length(facebook_url) <= 300 and facebook_url ~ '^https://')
  ),
  youtube_url text check (
    youtube_url is null
    or (char_length(youtube_url) <= 300 and youtube_url ~ '^https://')
  ),
  tiktok_url text check (
    tiktok_url is null
    or (char_length(tiktok_url) <= 300 and tiktok_url ~ '^https://')
  ),
  website_url text check (
    website_url is null
    or (char_length(website_url) <= 300 and website_url ~ '^https://')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_media (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  kind text not null check (kind in ('logo', 'cover', 'gallery')),
  storage_path text not null unique check (
    char_length(storage_path) between 50 and 180
    and storage_path ~ '^[0-9a-f-]{36}/(logo|cover|gallery)/[0-9a-f-]{36}\.(jpg|png|webp)$'
  ),
  alt_text text check (alt_text is null or char_length(alt_text) <= 160),
  sort_order smallint not null default 0 check (sort_order between 0 and 100),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index team_media_one_logo_idx
  on public.team_media (team_id) where kind = 'logo';
create unique index team_media_one_cover_idx
  on public.team_media (team_id) where kind = 'cover';
create index team_media_gallery_order_idx
  on public.team_media (team_id, sort_order, created_at) where kind = 'gallery';

create trigger team_public_profiles_set_updated_at
  before update on public.team_public_profiles
  for each row execute function private.set_updated_at();
create trigger team_media_set_updated_at
  before update on public.team_media
  for each row execute function private.set_updated_at();

alter table public.team_public_profiles enable row level security;
alter table public.team_media enable row level security;

create policy team_public_profiles_select_team on public.team_public_profiles
  for select to authenticated
  using (private.can_access_team(team_id));
create policy team_public_profiles_insert_admin on public.team_public_profiles
  for insert to authenticated
  with check (
    private.is_team_staff(
      team_id,
      array['owner', 'admin']::public.team_role[]
    )
  );
create policy team_public_profiles_update_admin on public.team_public_profiles
  for update to authenticated
  using (
    private.is_team_staff(
      team_id,
      array['owner', 'admin']::public.team_role[]
    )
  )
  with check (
    private.is_team_staff(
      team_id,
      array['owner', 'admin']::public.team_role[]
    )
  );

create policy team_media_select_team on public.team_media
  for select to authenticated
  using (private.can_access_team(team_id));

revoke all on public.team_public_profiles from public, anon, authenticated;
revoke all on public.team_media from public, anon, authenticated;
grant select, insert, update on public.team_public_profiles to authenticated;
grant select on public.team_media to authenticated;

create or replace function public.replace_team_identity_media(
  requested_team_id uuid,
  requested_kind text,
  requested_storage_path text,
  requested_alt_text text default null
)
returns text
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  old_storage_path text;
begin
  if (select auth.uid()) is null
    or not private.is_team_staff(
      requested_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Team media update not allowed' using errcode = '42501';
  end if;

  if requested_kind not in ('logo', 'cover')
    or requested_storage_path !~ (
      '^' || requested_team_id::text || '/' || requested_kind ||
      '/[0-9a-f-]{36}\.(jpg|png|webp)$'
    )
    or char_length(coalesce(requested_alt_text, '')) > 160
  then
    raise exception 'Invalid team media' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(requested_team_id::text || requested_kind, 0));

  select tm.storage_path
  into old_storage_path
  from public.team_media tm
  where tm.team_id = requested_team_id
    and tm.kind = requested_kind
  for update;

  delete from public.team_media
  where team_id = requested_team_id
    and kind = requested_kind;

  insert into public.team_media (
    team_id, kind, storage_path, alt_text, created_by
  ) values (
    requested_team_id,
    requested_kind,
    requested_storage_path,
    nullif(trim(coalesce(requested_alt_text, '')), ''),
    (select auth.uid())
  );

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    requested_team_id,
    (select auth.uid()),
    'team_media.replace',
    'team_media',
    requested_storage_path,
    jsonb_build_object('kind', requested_kind)
  );

  return old_storage_path;
end;
$$;

create or replace function public.add_team_gallery_media(
  requested_team_id uuid,
  requested_storage_path text,
  requested_alt_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  new_media_id uuid;
  next_sort_order smallint;
begin
  if (select auth.uid()) is null
    or not private.is_team_staff(
      requested_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Team media update not allowed' using errcode = '42501';
  end if;

  if requested_storage_path !~ (
      '^' || requested_team_id::text ||
      '/gallery/[0-9a-f-]{36}\.(jpg|png|webp)$'
    )
    or char_length(coalesce(requested_alt_text, '')) > 160
  then
    raise exception 'Invalid team media' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(requested_team_id::text || 'gallery', 0));

  if (
    select count(*)
    from public.team_media
    where team_id = requested_team_id and kind = 'gallery'
  ) >= 12 then
    raise exception 'Team gallery limit reached' using errcode = '54000';
  end if;

  select coalesce(max(sort_order), -1) + 1
  into next_sort_order
  from public.team_media
  where team_id = requested_team_id and kind = 'gallery';

  insert into public.team_media (
    team_id, kind, storage_path, alt_text, sort_order, created_by
  ) values (
    requested_team_id,
    'gallery',
    requested_storage_path,
    nullif(trim(coalesce(requested_alt_text, '')), ''),
    next_sort_order,
    (select auth.uid())
  )
  returning id into new_media_id;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    requested_team_id,
    (select auth.uid()),
    'team_media.insert',
    'team_media',
    new_media_id::text,
    jsonb_build_object('kind', 'gallery')
  );

  return new_media_id;
end;
$$;

create or replace function public.remove_team_media(requested_media_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target_media public.team_media%rowtype;
begin
  select *
  into target_media
  from public.team_media
  where id = requested_media_id
  for update;

  if target_media.id is null
    or (select auth.uid()) is null
    or not private.is_team_staff(
      target_media.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Team media delete not allowed' using errcode = '42501';
  end if;

  delete from public.team_media where id = target_media.id;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    target_media.team_id,
    (select auth.uid()),
    'team_media.delete',
    'team_media',
    target_media.id::text,
    jsonb_build_object('kind', target_media.kind)
  );

  return target_media.storage_path;
end;
$$;

revoke all on function public.replace_team_identity_media(uuid, text, text, text)
  from public, anon;
revoke all on function public.add_team_gallery_media(uuid, text, text)
  from public, anon;
revoke all on function public.remove_team_media(uuid)
  from public, anon;
grant execute on function public.replace_team_identity_media(uuid, text, text, text)
  to authenticated;
grant execute on function public.add_team_gallery_media(uuid, text, text)
  to authenticated;
grant execute on function public.remove_team_media(uuid)
  to authenticated;

create or replace view public.public_team_directory
with (security_barrier = true)
as
select
  t.slug::text as slug,
  t.name,
  coalesce(logo.storage_path, t.logo_path) as logo_path,
  t.default_sport_format,
  tp.about,
  tp.instagram_url,
  tp.facebook_url,
  tp.youtube_url,
  tp.tiktok_url,
  tp.website_url,
  cover.storage_path as cover_path
from public.teams t
left join public.team_public_profiles tp on tp.team_id = t.id
left join lateral (
  select tm.storage_path
  from public.team_media tm
  where tm.team_id = t.id and tm.kind = 'logo'
  limit 1
) logo on true
left join lateral (
  select tm.storage_path
  from public.team_media tm
  where tm.team_id = t.id and tm.kind = 'cover'
  limit 1
) cover on true
where t.is_public = true;

create view public.public_team_media
with (security_barrier = true)
as
select
  t.slug::text as team_slug,
  tm.id,
  tm.storage_path,
  tm.alt_text,
  tm.sort_order,
  tm.created_at
from public.teams t
join public.team_media tm on tm.team_id = t.id
where t.is_public = true
  and tm.kind = 'gallery';

revoke all on public.public_team_directory from public, anon, authenticated;
revoke all on public.public_team_media from public, anon, authenticated;
grant select on public.public_team_directory to anon, authenticated;
grant select on public.public_team_media to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team_media',
  'team_media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy team_media_objects_select_team on storage.objects
  for select to authenticated
  using (
    bucket_id = 'team_media'
    and private.can_access_team(private.try_uuid((storage.foldername(name))[1]))
  );

create policy team_media_objects_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'team_media'
    and private.is_team_staff(
      private.try_uuid((storage.foldername(name))[1]),
      array['owner', 'admin']::public.team_role[]
    )
  );

create policy team_media_objects_update_admin on storage.objects
  for update to authenticated
  using (
    bucket_id = 'team_media'
    and private.is_team_staff(
      private.try_uuid((storage.foldername(name))[1]),
      array['owner', 'admin']::public.team_role[]
    )
  )
  with check (
    bucket_id = 'team_media'
    and private.is_team_staff(
      private.try_uuid((storage.foldername(name))[1]),
      array['owner', 'admin']::public.team_role[]
    )
  );

create policy team_media_objects_delete_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'team_media'
    and private.is_team_staff(
      private.try_uuid((storage.foldername(name))[1]),
      array['owner', 'admin']::public.team_role[]
    )
  );

comment on table public.team_public_profiles is
  'Public-facing team biography and validated HTTPS social links.';
comment on table public.team_media is
  'Metadata for private logo, cover and gallery objects published through signed URLs.';
comment on function public.replace_team_identity_media(uuid, text, text, text) is
  'Atomically replaces a team logo or cover after an authenticated storage upload.';
comment on function public.add_team_gallery_media(uuid, text, text) is
  'Registers a gallery upload with a serialized limit of twelve items per team.';
comment on function public.remove_team_media(uuid) is
  'Removes authorized media metadata and returns the private object path for cleanup.';
