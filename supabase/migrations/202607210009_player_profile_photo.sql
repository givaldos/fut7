-- Player-owned profile photo. Objects remain private and are exposed publicly
-- only through the consent-filtered directory views and short-lived URLs.

create policy athlete_avatars_select_own_profile on storage.objects
  for select to authenticated
  using (
    bucket_id = 'athlete_avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'profile'
  );

create policy athlete_avatars_insert_own_profile on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'athlete_avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'profile'
  );

create policy athlete_avatars_update_own_profile on storage.objects
  for update to authenticated
  using (
    bucket_id = 'athlete_avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'profile'
  )
  with check (
    bucket_id = 'athlete_avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'profile'
  );

create policy athlete_avatars_delete_own_profile on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'athlete_avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'profile'
  );

create or replace function public.replace_my_player_photo(
  requested_storage_path text
)
returns text
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_path text := trim(requested_storage_path);
  previous_path text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if normalized_path !~ (
    '^' || current_user_id::text || '/profile/[0-9a-f-]{36}\.(jpg|png|webp)$'
  ) then
    raise exception 'Invalid player photo path' using errcode = '22023';
  end if;

  select pp.photo_path
  into previous_path
  from public.player_profiles pp
  where pp.user_id = current_user_id
  for update;

  if not found then
    raise exception 'Player profile not found' using errcode = 'P0002';
  end if;

  update public.player_profiles
  set photo_path = normalized_path
  where user_id = current_user_id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    current_user_id,
    'player_profiles.photo_replace',
    'player_profiles',
    current_user_id::text,
    jsonb_build_object('had_previous_photo', previous_path is not null)
  );

  return previous_path;
end;
$$;

create or replace function public.remove_my_player_photo()
returns text
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  previous_path text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select pp.photo_path
  into previous_path
  from public.player_profiles pp
  where pp.user_id = current_user_id
  for update;

  if not found then
    raise exception 'Player profile not found' using errcode = 'P0002';
  end if;

  update public.player_profiles
  set photo_path = null
  where user_id = current_user_id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    current_user_id,
    'player_profiles.photo_remove',
    'player_profiles',
    current_user_id::text,
    jsonb_build_object('had_photo', previous_path is not null)
  );

  return previous_path;
end;
$$;

create or replace view public.public_player_directory
with (security_barrier = true)
as
select
  pp.handle::text as handle,
  pp.display_name,
  pp.preferred_name,
  pp.bio,
  case
    when pp.photo_path ~ (
      '^' || pp.user_id::text || '/profile/[0-9a-f-]{36}\.(jpg|png|webp)$'
    ) then pp.photo_path
    else null
  end as photo_path,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sport_format', ppp.sport_format,
        'code', p.code,
        'label', p.label,
        'priority', ppp.priority
      ) order by ppp.sport_format, ppp.priority
    ) filter (where ppp.user_id is not null),
    '[]'::jsonb
  ) as positions
from public.player_profiles pp
left join public.player_position_preferences ppp on ppp.user_id = pp.user_id
left join public.positions p
  on p.sport_format = ppp.sport_format
  and p.code = ppp.position_code
where pp.is_public = true
group by pp.user_id;

create or replace view public.public_athlete_directory
with (security_barrier = true)
as
select
  t.slug::text as team_slug,
  a.registration_number,
  coalesce(pp.preferred_name, pp.display_name, a.preferred_name, a.full_name) as display_name,
  a.shirt_number,
  case
    when pp.photo_path ~ (
      '^' || pp.user_id::text || '/profile/[0-9a-f-]{36}\.(jpg|png|webp)$'
    ) then pp.photo_path
    when a.photo_path like (t.id::text || '/%') then a.photo_path
    else null
  end as photo_path,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sport_format', p.sport_format,
        'code', p.code,
        'label', p.label,
        'priority', app.priority
      ) order by app.sport_format, app.priority
    ) filter (where app.athlete_id is not null),
    '[]'::jsonb
  ) as positions,
  case when a.user_id is not null then pp.handle::text else null end as player_handle
from public.teams t
join public.athletes a on a.team_id = t.id
left join public.player_profiles pp on pp.user_id = a.user_id
left join public.athlete_position_preferences app on app.athlete_id = a.id
left join public.positions p
  on p.sport_format = app.sport_format
  and p.code = app.position_code
where t.is_public = true
  and a.status = 'active'
  and a.removed_at is null
  and (
    (a.user_id is not null and pp.is_public = true)
    or (a.user_id is null and a.public_profile = true)
  )
group by t.slug, t.id, a.id, pp.user_id;

revoke all on function public.replace_my_player_photo(text) from public;
revoke all on function public.remove_my_player_photo() from public;
grant execute on function public.replace_my_player_photo(text) to authenticated;
grant execute on function public.remove_my_player_photo() to authenticated;

revoke all on public.public_player_directory from public, anon, authenticated;
revoke all on public.public_athlete_directory from public, anon, authenticated;
grant select on public.public_player_directory to anon, authenticated;
grant select on public.public_athlete_directory to anon, authenticated;

comment on function public.replace_my_player_photo(text) is
  'Atomically links the current player to an owner-scoped private avatar object and returns the previous path for cleanup.';
comment on function public.remove_my_player_photo() is
  'Clears the current player avatar reference and returns its private object path for cleanup.';
comment on column public.player_profiles.photo_path is
  'Private athlete_avatars object owned by the player. Public views expose only validated paths after explicit profile consent.';
