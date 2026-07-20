-- Keep match events chronological and expose only consented aggregate statistics.

create or replace function private.require_started_match_incident()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_start timestamptz;
begin
  select event.starts_at
  into match_start
  from public.events event
  where event.id = new.event_id
    and event.team_id = new.team_id;

  if match_start is null or match_start > now() then
    raise exception 'A future match cannot receive incidents' using errcode = '55000';
  end if;

  return new;
end;
$$;

create trigger match_incidents_require_started_match
  before insert on public.match_incidents
  for each row execute function private.require_started_match_incident();

create or replace function public.get_public_player_statistics(
  requested_handle text
)
returns table (
  matches_played bigint,
  goals bigint,
  assists bigint,
  yellow_cards bigint,
  red_cards bigint
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select
    (
      select count(distinct report.event_id)
      from public.match_reports report
      join public.events event on event.id = report.event_id
      join public.event_attendance attendance on attendance.event_id = event.id
      join public.athletes athlete
        on athlete.id = attendance.athlete_id
        and athlete.team_id = event.team_id
      where athlete.user_id = profile.user_id
        and attendance.status = 'confirmed'
        and report.finalized_at is not null
        and event.status = 'completed'
    ),
    (
      select count(*)
      from public.match_incidents incident
      join public.match_reports report on report.event_id = incident.event_id
      join public.events event on event.id = incident.event_id
      join public.athletes athlete on athlete.id = incident.athlete_id
      where athlete.user_id = profile.user_id
        and incident.kind = 'goal'
        and report.finalized_at is not null
        and event.status = 'completed'
    ),
    (
      select count(*)
      from public.match_incidents incident
      join public.match_reports report on report.event_id = incident.event_id
      join public.events event on event.id = incident.event_id
      join public.athletes athlete on athlete.id = incident.assist_athlete_id
      where athlete.user_id = profile.user_id
        and incident.kind = 'goal'
        and report.finalized_at is not null
        and event.status = 'completed'
    ),
    (
      select count(*)
      from public.match_incidents incident
      join public.match_reports report on report.event_id = incident.event_id
      join public.events event on event.id = incident.event_id
      join public.athletes athlete on athlete.id = incident.athlete_id
      where athlete.user_id = profile.user_id
        and incident.kind = 'yellow_card'
        and report.finalized_at is not null
        and event.status = 'completed'
    ),
    (
      select count(*)
      from public.match_incidents incident
      join public.match_reports report on report.event_id = incident.event_id
      join public.events event on event.id = incident.event_id
      join public.athletes athlete on athlete.id = incident.athlete_id
      where athlete.user_id = profile.user_id
        and incident.kind = 'red_card'
        and report.finalized_at is not null
        and event.status = 'completed'
    )
  from public.player_profiles profile
  where profile.handle = lower(trim(requested_handle))::extensions.citext
    and profile.is_public = true;
$$;

revoke all on function private.require_started_match_incident() from public;
revoke all on function public.get_public_player_statistics(text) from public, anon, authenticated;
grant execute on function public.get_public_player_statistics(text) to anon, authenticated;

comment on function public.get_public_player_statistics(text) is
  'Returns finalized aggregate statistics only when the player explicitly made the profile public.';
