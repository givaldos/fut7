-- Let each team choose one editorial highlight for its public gallery.

alter table public.team_media
  add column is_featured boolean not null default false;

alter table public.team_media
  add constraint team_media_featured_gallery_only_check check (
    is_featured = false or kind = 'gallery'
  );

with first_gallery_photo as (
  select distinct on (team_id) id
  from public.team_media
  where kind = 'gallery'
  order by team_id, sort_order, created_at, id
)
update public.team_media media
set is_featured = true
from first_gallery_photo first_photo
where media.id = first_photo.id;

create unique index team_media_one_featured_gallery_idx
  on public.team_media (team_id)
  where kind = 'gallery' and is_featured = true;

create or replace function private.keep_gallery_featured()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.kind = 'gallery' then
    if not exists (
      select 1
      from public.team_media media
      where media.team_id = new.team_id
        and media.kind = 'gallery'
        and media.is_featured = true
        and media.id <> new.id
    ) then
      update public.team_media
      set is_featured = true
      where id = new.id;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE'
    and old.kind = 'gallery'
    and old.is_featured = true
  then
    update public.team_media
    set is_featured = true
    where id = (
      select media.id
      from public.team_media media
      where media.team_id = old.team_id
        and media.kind = 'gallery'
      order by media.sort_order, media.created_at, media.id
      limit 1
    );
  end if;

  return old;
end;
$$;

create trigger keep_gallery_featured_after_insert
  after insert on public.team_media
  for each row execute function private.keep_gallery_featured();

create trigger keep_gallery_featured_after_delete
  after delete on public.team_media
  for each row execute function private.keep_gallery_featured();

create or replace function public.set_team_featured_media(
  requested_media_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target_media public.team_media%rowtype;
begin
  select media.*
  into target_media
  from public.team_media media
  where media.id = requested_media_id
  for update;

  if target_media.id is null
    or target_media.kind <> 'gallery'
    or (select auth.uid()) is null
    or not private.is_team_staff(
      target_media.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Featured team media update not allowed' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_media.team_id::text || 'featured-gallery', 0)
  );

  update public.team_media
  set is_featured = false
  where team_id = target_media.team_id
    and kind = 'gallery'
    and is_featured = true
    and id <> target_media.id;

  update public.team_media
  set is_featured = true
  where id = target_media.id
    and is_featured = false;

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_media.team_id,
    (select auth.uid()),
    'team_media.feature',
    'team_media',
    target_media.id::text,
    jsonb_build_object('kind', 'gallery')
  );

  return true;
end;
$$;

create or replace view public.public_team_media
with (security_barrier = true)
as
select
  t.slug::text as team_slug,
  media.id,
  media.storage_path,
  media.alt_text,
  media.sort_order,
  media.created_at,
  media.is_featured
from public.teams t
join public.team_media media on media.team_id = t.id
where t.is_public = true
  and media.kind = 'gallery';

revoke all on function private.keep_gallery_featured() from public;
revoke all on function public.set_team_featured_media(uuid)
  from public, anon;
grant execute on function public.set_team_featured_media(uuid)
  to authenticated;

revoke all on public.public_team_media from public, anon, authenticated;
grant select on public.public_team_media to anon, authenticated;

comment on column public.team_media.is_featured is
  'Selects the single gallery image that receives editorial emphasis on the public team page.';
comment on function public.set_team_featured_media(uuid) is
  'Owner/admin-only, serialized and audited selection of one featured gallery image per team.';
