-- One featured image spans four cells and twelve regular images complete a
-- balanced 4x4 editorial mosaic on wide screens.

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

  perform pg_advisory_xact_lock(
    hashtextextended(requested_team_id::text || 'gallery', 0)
  );

  if (
    select count(*)
    from public.team_media
    where team_id = requested_team_id and kind = 'gallery'
  ) >= 13 then
    raise exception 'Team gallery limit reached' using errcode = '54000';
  end if;

  select coalesce(max(sort_order), -1) + 1
  into next_sort_order
  from public.team_media
  where team_id = requested_team_id and kind = 'gallery';

  insert into public.team_media (
    team_id,
    kind,
    storage_path,
    alt_text,
    sort_order,
    created_by
  )
  values (
    requested_team_id,
    'gallery',
    requested_storage_path,
    nullif(trim(coalesce(requested_alt_text, '')), ''),
    next_sort_order,
    (select auth.uid())
  )
  returning id into new_media_id;

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
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

revoke all on function public.add_team_gallery_media(uuid, text, text)
  from public, anon;
grant execute on function public.add_team_gallery_media(uuid, text, text)
  to authenticated;

comment on function public.add_team_gallery_media(uuid, text, text) is
  'Adds up to thirteen serialized gallery images so one featured plus twelve regular images complete the editorial mosaic.';
