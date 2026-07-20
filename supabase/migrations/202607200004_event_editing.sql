-- Recurring event occurrences remain independently editable while retaining a
-- stable order inside the series. Individual overrides are protected from a
-- later "this and future" bulk edit.

alter table public.events
  add column series_position smallint,
  add column is_series_exception boolean not null default false;

with ranked_occurrences as (
  select
    e.id,
    row_number() over (
      partition by e.series_id
      order by e.starts_at, e.created_at, e.id
    )::smallint as series_position
  from public.events e
  where e.series_id is not null
)
update public.events e
set series_position = ranked.series_position
from ranked_occurrences ranked
where ranked.id = e.id;

alter table public.events
  add constraint events_series_position_consistency check (
    (
      series_id is null
      and series_position is null
      and is_series_exception is false
    )
    or (
      series_id is not null
      and series_position is not null
      and series_position > 0
    )
  );

drop index if exists public.events_series_occurrence_idx;

create unique index events_series_position_idx
  on public.events (series_id, series_position)
  where series_id is not null;

create or replace function private.assign_event_series_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.series_id is null then
    new.series_position := null;
    new.is_series_exception := false;
    return new;
  end if;

  if new.series_position is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.series_id::text, 0)
    );

    select (coalesce(max(e.series_position), 0) + 1)::smallint
    into new.series_position
    from public.events e
    where e.series_id = new.series_id;
  end if;

  return new;
end;
$$;

create trigger events_assign_series_position
  before insert on public.events
  for each row execute function private.assign_event_series_position();

drop trigger events_immutable_columns on public.events;
create trigger events_immutable_columns
  before update on public.events
  for each row execute function private.prevent_column_changes(
    'id', 'team_id', 'created_by', 'series_id', 'series_position'
  );

create or replace function public.update_event_as_staff(
  requested_team_id uuid,
  requested_event_id uuid,
  edit_scope text,
  event_title text,
  event_kind public.event_kind,
  event_organization_mode public.organization_mode,
  event_sport_format public.sport_format,
  event_starts_at timestamptz,
  event_duration_minutes integer,
  attendance_deadline_minutes integer,
  event_opponent_name text default null,
  event_venue_name text default null,
  event_venue_address text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  target_series public.event_series%rowtype;
  normalized_title text := trim(event_title);
  normalized_opponent text := nullif(trim(event_opponent_name), '');
  normalized_venue_name text := nullif(trim(event_venue_name), '');
  normalized_venue_address text := nullif(trim(event_venue_address), '');
  selected_venue_id uuid;
  updated_count integer := 0;
begin
  select e.*
  into target_event
  from public.events e
  where e.id = requested_event_id
    and e.team_id = requested_team_id
  for update;

  if target_event.id is null
    or current_user_id is null
    or not private.is_team_staff(requested_team_id)
  then
    raise exception 'Event update not allowed' using errcode = '42501';
  end if;

  if target_event.status <> 'scheduled'
    or target_event.starts_at <= now()
  then
    raise exception 'Only upcoming scheduled events can be edited' using errcode = '55000';
  end if;

  if edit_scope is null
    or edit_scope not in ('single_event', 'this_and_future')
    or normalized_title is null
    or char_length(normalized_title) not between 2 and 120
    or event_kind is null
    or event_organization_mode is null
    or event_sport_format is null
    or event_starts_at is null
    or event_starts_at <= now()
    or event_duration_minutes is null
    or event_duration_minutes not between 15 and 480
    or attendance_deadline_minutes is null
    or attendance_deadline_minutes not between 0 and 43200
    or (normalized_opponent is not null and char_length(normalized_opponent) > 120)
    or (normalized_venue_name is not null and char_length(normalized_venue_name) not between 2 and 120)
    or (normalized_venue_address is not null and char_length(normalized_venue_address) > 500)
  then
    raise exception 'Invalid event update data' using errcode = '22023';
  end if;

  if normalized_venue_name is not null then
    select v.id
    into selected_venue_id
    from public.venues v
    where v.team_id = requested_team_id
      and lower(v.name) = lower(normalized_venue_name)
      and coalesce(lower(v.address), '') = coalesce(lower(normalized_venue_address), '')
    order by v.created_at
    limit 1;

    if selected_venue_id is null then
      insert into public.venues (team_id, name, address)
      values (requested_team_id, normalized_venue_name, normalized_venue_address)
      returning id into selected_venue_id;
    end if;
  end if;

  if event_sport_format <> target_event.sport_format then
    if edit_scope = 'single_event' or target_event.series_id is null then
      if exists (
        select 1
        from public.event_squads squad
        where squad.event_id = target_event.id
      ) then
        raise exception 'Sport format cannot change after squads are created' using errcode = '55000';
      end if;
    elsif exists (
      select 1
      from public.event_squads squad
      join public.events e on e.id = squad.event_id
      where e.series_id = target_event.series_id
        and e.series_position >= target_event.series_position
        and (e.is_series_exception is false or e.id = target_event.id)
    ) then
      raise exception 'Sport format cannot change after squads are created' using errcode = '55000';
    end if;
  end if;

  if edit_scope = 'this_and_future' and target_event.series_id is not null then
    select series.*
    into target_series
    from public.event_series series
    where series.id = target_event.series_id
      and series.team_id = requested_team_id
    for update;

    update public.events e
    set
      title = normalized_title,
      kind = event_kind,
      organization_mode = event_organization_mode,
      sport_format = event_sport_format,
      starts_at = event_starts_at + pg_catalog.make_interval(
        weeks => (e.series_position - target_event.series_position)::integer
      ),
      ends_at = event_starts_at + pg_catalog.make_interval(
        weeks => (e.series_position - target_event.series_position)::integer,
        mins => event_duration_minutes
      ),
      attendance_deadline = event_starts_at + pg_catalog.make_interval(
        weeks => (e.series_position - target_event.series_position)::integer,
        mins => -attendance_deadline_minutes
      ),
      venue_id = selected_venue_id,
      opponent_name = normalized_opponent,
      is_series_exception = false
    where e.series_id = target_event.series_id
      and e.series_position >= target_event.series_position
      and e.status = 'scheduled'
      and (e.is_series_exception is false or e.id = target_event.id);

    get diagnostics updated_count = row_count;

    update public.event_series series
    set
      title = normalized_title,
      kind = event_kind,
      organization_mode = event_organization_mode,
      sport_format = event_sport_format,
      starts_on = case
        when target_event.series_position = 1
          then (event_starts_at at time zone target_series.timezone)::date
        else series.starts_on
      end,
      ends_on = (
        select max((e.starts_at at time zone target_series.timezone)::date)
        from public.events e
        where e.series_id = target_event.series_id
      ),
      local_start_time = (event_starts_at at time zone target_series.timezone)::time,
      duration_minutes = event_duration_minutes,
      attendance_deadline_offset = pg_catalog.make_interval(
        mins => attendance_deadline_minutes
      ),
      venue_id = selected_venue_id
    where series.id = target_event.series_id;
  else
    update public.events e
    set
      title = normalized_title,
      kind = event_kind,
      organization_mode = event_organization_mode,
      sport_format = event_sport_format,
      starts_at = event_starts_at,
      ends_at = event_starts_at + pg_catalog.make_interval(
        mins => event_duration_minutes
      ),
      attendance_deadline = event_starts_at - pg_catalog.make_interval(
        mins => attendance_deadline_minutes
      ),
      venue_id = selected_venue_id,
      opponent_name = normalized_opponent,
      is_series_exception = target_event.series_id is not null
    where e.id = target_event.id;

    updated_count := 1;
  end if;

  return updated_count;
end;
$$;

-- Event changes must pass through the transactional workflow and its
-- authorization, lifecycle and series-scope checks.
revoke update on public.events from authenticated;

revoke all on function private.assign_event_series_position() from public, anon, authenticated;
revoke all on function public.update_event_as_staff(uuid, uuid, text, text, public.event_kind, public.organization_mode, public.sport_format, timestamptz, integer, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.update_event_as_staff(uuid, uuid, text, text, public.event_kind, public.organization_mode, public.sport_format, timestamptz, integer, integer, text, text, text) to authenticated;

comment on column public.events.series_position is
  'Stable one-based occurrence order inside a recurring series.';
comment on column public.events.is_series_exception is
  'True when this occurrence was edited independently and must be preserved by future bulk edits.';
comment on function public.update_event_as_staff(uuid, uuid, text, text, public.event_kind, public.organization_mode, public.sport_format, timestamptz, integer, integer, text, text, text) is
  'Safely edits one upcoming occurrence or the selected occurrence and non-exception future occurrences while preserving attendance.';
