-- Public teams may publish their upcoming schedule without exposing attendance,
-- venue addresses or any other tenant-private data.

create view public.public_team_upcoming_events
with (security_barrier = true)
as
select
  t.slug::text as team_slug,
  t.timezone as team_timezone,
  e.id as event_id,
  e.title,
  e.kind,
  e.sport_format,
  e.starts_at,
  e.ends_at,
  e.attendance_deadline,
  e.opponent_name
from public.teams t
join public.events e on e.team_id = t.id
where t.is_public = true
  and e.status = 'scheduled'
  and e.starts_at > now();

revoke all on public.public_team_upcoming_events from public, anon, authenticated;
grant select on public.public_team_upcoming_events to anon, authenticated;

comment on view public.public_team_upcoming_events is
  'Minimal public schedule for public teams. Attendance and detailed venue data remain private.';
