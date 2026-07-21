-- Keep the team identity and its public social profile in one authorized write.

create or replace function public.update_team_social_settings(
  requested_team_id uuid,
  requested_slug text,
  requested_name text,
  requested_sport_format public.sport_format,
  requested_timezone text,
  requested_is_public boolean,
  requested_about text,
  requested_instagram_url text,
  requested_facebook_url text,
  requested_youtube_url text,
  requested_tiktok_url text,
  requested_website_url text
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
begin
  if (select auth.uid()) is null
    or not private.is_team_staff(
      requested_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Team settings update not allowed' using errcode = '42501';
  end if;

  update public.teams
  set
    name = trim(requested_name),
    default_sport_format = requested_sport_format,
    timezone = requested_timezone,
    is_public = requested_is_public
  where id = requested_team_id
    and slug = lower(trim(requested_slug))::extensions.citext;

  if not found then
    raise exception 'Team not found' using errcode = 'P0002';
  end if;

  insert into public.team_public_profiles (
    team_id,
    about,
    instagram_url,
    facebook_url,
    youtube_url,
    tiktok_url,
    website_url
  ) values (
    requested_team_id,
    nullif(trim(coalesce(requested_about, '')), ''),
    nullif(trim(coalesce(requested_instagram_url, '')), ''),
    nullif(trim(coalesce(requested_facebook_url, '')), ''),
    nullif(trim(coalesce(requested_youtube_url, '')), ''),
    nullif(trim(coalesce(requested_tiktok_url, '')), ''),
    nullif(trim(coalesce(requested_website_url, '')), '')
  )
  on conflict (team_id) do update set
    about = excluded.about,
    instagram_url = excluded.instagram_url,
    facebook_url = excluded.facebook_url,
    youtube_url = excluded.youtube_url,
    tiktok_url = excluded.tiktok_url,
    website_url = excluded.website_url;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    requested_team_id,
    (select auth.uid()),
    'team.social_settings.update',
    'teams',
    requested_team_id::text,
    jsonb_build_object(
      'is_public', requested_is_public,
      'sport_format', requested_sport_format
    )
  );

  return true;
end;
$$;

revoke all on function public.update_team_social_settings(
  uuid, text, text, public.sport_format, text, boolean,
  text, text, text, text, text, text
) from public, anon;
grant execute on function public.update_team_social_settings(
  uuid, text, text, public.sport_format, text, boolean,
  text, text, text, text, text, text
) to authenticated;

comment on function public.update_team_social_settings(
  uuid, text, text, public.sport_format, text, boolean,
  text, text, text, text, text, text
) is
  'Atomically updates core team identity and validated public social fields for owner/admin.';
