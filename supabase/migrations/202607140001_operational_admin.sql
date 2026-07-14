-- Guarded operational workflows for the team administration area.
-- Multi-table writes stay atomic and tenant authorization is re-checked in SQL.

create or replace function public.create_athlete_as_staff(
  requested_team_id uuid,
  athlete_full_name text,
  athlete_preferred_name text default null,
  athlete_shirt_number integer default null,
  athlete_birth_date date default null,
  athlete_phone_e164 text default null,
  athlete_email text default null,
  athlete_public_profile boolean default false,
  position_codes text[] default '{}'::text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_full_name text := trim(athlete_full_name);
  normalized_preferred_name text := nullif(trim(athlete_preferred_name), '');
  normalized_phone text := nullif(trim(athlete_phone_e164), '');
  normalized_email text := nullif(lower(trim(athlete_email)), '');
  requested_positions text[] := coalesce(position_codes, '{}'::text[]);
  team_sport public.sport_format;
  new_athlete_id uuid;
  position_code text;
  position_priority smallint := 0;
begin
  if current_user_id is null or not private.is_team_staff(requested_team_id) then
    raise exception 'Team staff access required' using errcode = '42501';
  end if;

  select t.default_sport_format
  into team_sport
  from public.teams t
  where t.id = requested_team_id;

  if team_sport is null then
    raise exception 'Team not found' using errcode = '22023';
  end if;

  if char_length(normalized_full_name) not between 2 and 120
    or (normalized_preferred_name is not null and char_length(normalized_preferred_name) not between 2 and 60)
    or (athlete_shirt_number is not null and athlete_shirt_number not between 1 and 99)
    or (athlete_birth_date is not null and athlete_birth_date not between date '1900-01-01' and current_date)
    or (normalized_phone is not null and normalized_phone !~ '^\+[1-9][0-9]{7,14}$')
    or (
      normalized_email is not null
      and (
        char_length(normalized_email) > 254
        or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      )
    )
    or coalesce(array_length(requested_positions, 1), 0) > 3
    or (
      select count(*) <> count(distinct candidate)
      from unnest(requested_positions) candidate
    )
    or exists (
      select 1
      from unnest(requested_positions) candidate
      where not exists (
        select 1
        from public.positions p
        where p.sport_format = team_sport
          and p.code = candidate
      )
    )
  then
    raise exception 'Invalid athlete data' using errcode = '22023';
  end if;

  insert into public.athletes (
    team_id,
    full_name,
    preferred_name,
    shirt_number,
    status,
    registration_source,
    public_profile,
    joined_on,
    approved_at,
    approved_by,
    created_by
  )
  values (
    requested_team_id,
    normalized_full_name,
    normalized_preferred_name,
    athlete_shirt_number,
    'active',
    'admin',
    coalesce(athlete_public_profile, false),
    current_date,
    now(),
    current_user_id,
    current_user_id
  )
  returning id into new_athlete_id;

  if athlete_birth_date is not null or normalized_phone is not null or normalized_email is not null then
    insert into public.athlete_private (
      athlete_id,
      team_id,
      birth_date,
      phone_e164,
      email
    )
    values (
      new_athlete_id,
      requested_team_id,
      athlete_birth_date,
      normalized_phone,
      normalized_email
    );
  end if;

  foreach position_code in array requested_positions loop
    position_priority := position_priority + 1;
    insert into public.athlete_position_preferences (
      athlete_id,
      team_id,
      sport_format,
      position_code,
      priority
    )
    values (
      new_athlete_id,
      requested_team_id,
      team_sport,
      position_code,
      position_priority
    );
  end loop;

  insert into public.event_attendance (event_id, team_id, athlete_id)
  select e.id, e.team_id, new_athlete_id
  from public.events e
  where e.team_id = requested_team_id
    and e.status = 'scheduled'
    and e.starts_at > now()
  on conflict (event_id, athlete_id) do nothing;

  return new_athlete_id;
end;
$$;

create or replace function public.review_athlete_registration(
  requested_athlete_id uuid,
  decision text
)
returns public.athlete_status
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  athlete_team_id uuid;
  next_status public.athlete_status;
begin
  select a.team_id
  into athlete_team_id
  from public.athletes a
  where a.id = requested_athlete_id
  for update;

  if athlete_team_id is null
    or current_user_id is null
    or not private.is_team_staff(athlete_team_id)
  then
    raise exception 'Team staff access required' using errcode = '42501';
  end if;

  if decision = 'approve' then
    next_status := 'active';
  elsif decision = 'reject' then
    next_status := 'rejected';
  else
    raise exception 'Invalid review decision' using errcode = '22023';
  end if;

  update public.athletes
  set
    status = next_status,
    joined_on = case when next_status = 'active' then coalesce(joined_on, current_date) else joined_on end,
    approved_at = case when next_status = 'active' then now() else null end,
    approved_by = case when next_status = 'active' then current_user_id else null end
  where id = requested_athlete_id
    and status = 'pending';

  if not found then
    raise exception 'Athlete is no longer pending' using errcode = '55000';
  end if;

  if next_status = 'active' then
    insert into public.event_attendance (event_id, team_id, athlete_id)
    select e.id, e.team_id, requested_athlete_id
    from public.events e
    where e.team_id = athlete_team_id
      and e.status = 'scheduled'
      and e.starts_at > now()
    on conflict (event_id, athlete_id) do nothing;
  end if;

  return next_status;
end;
$$;

create or replace function public.set_athlete_availability(
  requested_athlete_id uuid,
  next_status public.athlete_status
)
returns public.athlete_status
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  athlete_team_id uuid;
begin
  select a.team_id
  into athlete_team_id
  from public.athletes a
  where a.id = requested_athlete_id
  for update;

  if athlete_team_id is null or not private.is_team_staff(athlete_team_id) then
    raise exception 'Team staff access required' using errcode = '42501';
  end if;

  if next_status not in ('active', 'inactive') then
    raise exception 'Invalid athlete status' using errcode = '22023';
  end if;

  update public.athletes
  set status = next_status
  where id = requested_athlete_id
    and status in ('active', 'inactive');

  if not found then
    raise exception 'Athlete status cannot be changed' using errcode = '55000';
  end if;

  return next_status;
end;
$$;

create or replace function public.create_event_as_staff(
  requested_team_id uuid,
  event_title text,
  event_kind public.event_kind,
  event_organization_mode public.organization_mode,
  event_sport_format public.sport_format,
  event_starts_at timestamptz,
  event_duration_minutes integer,
  attendance_deadline_minutes integer,
  repeat_weeks integer default 1,
  event_opponent_name text default null,
  event_venue_name text default null,
  event_venue_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_title text := trim(event_title);
  normalized_opponent text := nullif(trim(event_opponent_name), '');
  normalized_venue_name text := nullif(trim(event_venue_name), '');
  normalized_venue_address text := nullif(trim(event_venue_address), '');
  team_timezone text;
  series_id uuid;
  venue_id uuid;
  occurrence integer;
  occurrence_starts_at timestamptz;
  new_event_id uuid;
  first_event_id uuid;
begin
  if current_user_id is null or not private.is_team_staff(requested_team_id) then
    raise exception 'Team staff access required' using errcode = '42501';
  end if;

  select t.timezone
  into team_timezone
  from public.teams t
  where t.id = requested_team_id;

  if team_timezone is null
    or char_length(normalized_title) not between 2 and 120
    or event_kind is null
    or event_organization_mode is null
    or event_sport_format is null
    or event_starts_at < now() - interval '5 minutes'
    or event_duration_minutes not between 15 and 480
    or attendance_deadline_minutes not between 0 and 43200
    or repeat_weeks not between 1 and 52
    or (normalized_opponent is not null and char_length(normalized_opponent) > 120)
    or (normalized_venue_name is not null and char_length(normalized_venue_name) not between 2 and 120)
    or (normalized_venue_address is not null and char_length(normalized_venue_address) > 500)
  then
    raise exception 'Invalid event data' using errcode = '22023';
  end if;

  if normalized_venue_name is not null then
    select v.id
    into venue_id
    from public.venues v
    where v.team_id = requested_team_id
      and lower(v.name) = lower(normalized_venue_name)
      and coalesce(lower(v.address), '') = coalesce(lower(normalized_venue_address), '')
    order by v.created_at
    limit 1;

    if venue_id is null then
      insert into public.venues (team_id, name, address)
      values (requested_team_id, normalized_venue_name, normalized_venue_address)
      returning id into venue_id;
    end if;
  end if;

  if repeat_weeks > 1 then
    insert into public.event_series (
      team_id,
      title,
      kind,
      organization_mode,
      sport_format,
      recurrence_rule,
      starts_on,
      ends_on,
      local_start_time,
      timezone,
      duration_minutes,
      attendance_deadline_offset,
      venue_id,
      created_by
    )
    values (
      requested_team_id,
      normalized_title,
      event_kind,
      event_organization_mode,
      event_sport_format,
      'FREQ=WEEKLY;COUNT=' || repeat_weeks::text,
      (event_starts_at at time zone team_timezone)::date,
      ((event_starts_at + ((repeat_weeks - 1)::text || ' weeks')::interval) at time zone team_timezone)::date,
      (event_starts_at at time zone team_timezone)::time,
      team_timezone,
      event_duration_minutes,
      make_interval(mins => attendance_deadline_minutes),
      venue_id,
      current_user_id
    )
    returning id into series_id;
  end if;

  for occurrence in 0..repeat_weeks - 1 loop
    occurrence_starts_at := event_starts_at + ((occurrence::text || ' weeks')::interval);

    insert into public.events (
      team_id,
      series_id,
      title,
      kind,
      organization_mode,
      sport_format,
      starts_at,
      ends_at,
      attendance_deadline,
      venue_id,
      opponent_name,
      created_by
    )
    values (
      requested_team_id,
      series_id,
      normalized_title,
      event_kind,
      event_organization_mode,
      event_sport_format,
      occurrence_starts_at,
      occurrence_starts_at + make_interval(mins => event_duration_minutes),
      occurrence_starts_at - make_interval(mins => attendance_deadline_minutes),
      venue_id,
      normalized_opponent,
      current_user_id
    )
    returning id into new_event_id;

    first_event_id := coalesce(first_event_id, new_event_id);

    insert into public.event_attendance (event_id, team_id, athlete_id)
    select new_event_id, requested_team_id, a.id
    from public.athletes a
    where a.team_id = requested_team_id
      and a.status = 'active';
  end loop;

  return first_event_id;
end;
$$;

create or replace function public.set_event_attendance_as_staff(
  requested_event_id uuid,
  requested_athlete_id uuid,
  next_status public.attendance_status
)
returns public.attendance_status
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  event_team_id uuid;
begin
  select e.team_id
  into event_team_id
  from public.events e
  where e.id = requested_event_id
    and e.status = 'scheduled';

  if event_team_id is null
    or current_user_id is null
    or not private.is_team_staff(event_team_id)
    or next_status not in ('pending', 'confirmed', 'declined', 'maybe', 'waitlist')
    or not exists (
      select 1
      from public.athletes a
      where a.id = requested_athlete_id
        and a.team_id = event_team_id
        and a.status = 'active'
    )
  then
    raise exception 'Attendance update not allowed' using errcode = '42501';
  end if;

  insert into public.event_attendance (
    event_id,
    team_id,
    athlete_id,
    status,
    source,
    responded_at,
    responded_by
  )
  values (
    requested_event_id,
    event_team_id,
    requested_athlete_id,
    next_status,
    'admin',
    case when next_status = 'pending' then null else now() end,
    case when next_status = 'pending' then null else current_user_id end
  )
  on conflict (event_id, athlete_id) do update
  set
    status = excluded.status,
    source = excluded.source,
    responded_at = excluded.responded_at,
    responded_by = excluded.responded_by;

  return next_status;
end;
$$;

-- New records with related data must go through the transactional workflows.
revoke insert on public.athletes from authenticated;
revoke insert on public.athlete_private from authenticated;
revoke insert on public.venues from authenticated;
revoke insert on public.events from authenticated;
revoke insert on public.event_attendance from authenticated;

revoke all on function public.create_athlete_as_staff(uuid, text, text, integer, date, text, text, boolean, text[]) from public;
revoke all on function public.review_athlete_registration(uuid, text) from public;
revoke all on function public.set_athlete_availability(uuid, public.athlete_status) from public;
revoke all on function public.create_event_as_staff(uuid, text, public.event_kind, public.organization_mode, public.sport_format, timestamptz, integer, integer, integer, text, text, text) from public;
revoke all on function public.set_event_attendance_as_staff(uuid, uuid, public.attendance_status) from public;

grant execute on function public.create_athlete_as_staff(uuid, text, text, integer, date, text, text, boolean, text[]) to authenticated;
grant execute on function public.review_athlete_registration(uuid, text) to authenticated;
grant execute on function public.set_athlete_availability(uuid, public.athlete_status) to authenticated;
grant execute on function public.create_event_as_staff(uuid, text, public.event_kind, public.organization_mode, public.sport_format, timestamptz, integer, integer, integer, text, text, text) to authenticated;
grant execute on function public.set_event_attendance_as_staff(uuid, uuid, public.attendance_status) to authenticated;

comment on function public.create_athlete_as_staff(uuid, text, text, integer, date, text, text, boolean, text[]) is
  'Atomically creates an approved athlete, private data, position preferences and future attendance rows for team staff.';
comment on function public.create_event_as_staff(uuid, text, public.event_kind, public.organization_mode, public.sport_format, timestamptz, integer, integer, integer, text, text, text) is
  'Atomically creates one or more weekly event occurrences and seeds attendance for active athletes.';
