-- Prevent the server-side signed-URL helper from becoming a confused deputy.
-- Only paths established by the media metadata relation, or avatar paths under
-- the current team folder, may reach the public views.

create or replace view public.public_team_directory
with (security_barrier = true)
as
select
  t.slug::text as slug,
  t.name,
  logo.storage_path as logo_path,
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

create or replace view public.public_athlete_directory
with (security_barrier = true)
as
select
  t.slug::text as team_slug,
  a.registration_number,
  coalesce(pp.preferred_name, pp.display_name, a.preferred_name, a.full_name) as display_name,
  a.shirt_number,
  case
    when pp.photo_path like (t.id::text || '/%') then pp.photo_path
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
  ) as positions
from public.teams t
join public.athletes a on a.team_id = t.id
left join public.player_profiles pp on pp.user_id = a.user_id
left join public.athlete_position_preferences app on app.athlete_id = a.id
left join public.positions p
  on p.sport_format = app.sport_format
  and p.code = app.position_code
where t.is_public = true
  and a.status = 'active'
  and (
    (a.user_id is not null and pp.is_public = true)
    or (a.user_id is null and a.public_profile = true)
  )
group by t.slug, t.id, a.id, pp.user_id;

revoke all on public.public_team_directory from public, anon, authenticated;
revoke all on public.public_athlete_directory from public, anon, authenticated;
grant select on public.public_team_directory to anon, authenticated;
grant select on public.public_athlete_directory to anon, authenticated;

comment on view public.public_team_directory is
  'Public team profile; media paths only originate from authorized team_media metadata.';
comment on view public.public_athlete_directory is
  'Public BID; avatar paths are constrained to the current team storage folder.';
