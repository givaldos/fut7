-- Separate player-owned identity from the team-owned roster relationship.
-- Removed relationships are physically deleted only when no sporting history exists.

alter table public.athletes
  add column removed_at timestamptz,
  add column removed_by uuid references auth.users (id) on delete set null;

alter table public.athletes
  add constraint athletes_removal_state_check check (
    removed_at is not null or removed_by is null
  );

create index athletes_team_removed_idx
  on public.athletes (team_id, removed_at, updated_at desc);

create or replace function public.update_athlete_as_admin(
  requested_athlete_id uuid,
  athlete_full_name text default null,
  athlete_preferred_name text default null,
  athlete_shirt_number integer default null,
  athlete_birth_date date default null,
  athlete_phone_e164 text default null,
  athlete_email text default null,
  athlete_public_profile boolean default null,
  position_codes text[] default null,
  team_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_athlete public.athletes%rowtype;
  team_sport public.sport_format;
  normalized_full_name text := nullif(trim(athlete_full_name), '');
  normalized_preferred_name text := nullif(trim(athlete_preferred_name), '');
  normalized_phone text := nullif(trim(athlete_phone_e164), '');
  normalized_email text := nullif(lower(trim(athlete_email)), '');
  normalized_notes text := nullif(trim(team_notes), '');
  requested_positions text[] := coalesce(position_codes, '{}'::text[]);
  position_code text;
  position_priority smallint := 0;
begin
  select a.*
  into target_athlete
  from public.athletes a
  where a.id = requested_athlete_id
  for update;

  if target_athlete.id is null
    or current_user_id is null
    or not private.is_team_staff(
      target_athlete.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Team owner or admin access required' using errcode = '42501';
  end if;

  if target_athlete.removed_at is not null then
    raise exception 'Removed athlete relationships cannot be edited' using errcode = '55000';
  end if;

  if (athlete_shirt_number is not null and athlete_shirt_number not between 1 and 99)
    or (normalized_notes is not null and char_length(normalized_notes) > 2000)
  then
    raise exception 'Invalid team athlete data' using errcode = '22023';
  end if;

  if target_athlete.user_id is not null then
    if athlete_full_name is not null
      or athlete_preferred_name is not null
      or athlete_birth_date is not null
      or athlete_phone_e164 is not null
      or athlete_email is not null
      or athlete_public_profile is not null
      or position_codes is not null
    then
      raise exception 'Player-owned profile fields are read only for team administrators'
        using errcode = '55000';
    end if;

    update public.athletes
    set shirt_number = athlete_shirt_number
    where id = target_athlete.id;

    if normalized_notes is null then
      update public.athlete_private
      set notes = null
      where athlete_id = target_athlete.id;
    else
      insert into public.athlete_private (athlete_id, team_id, notes)
      values (target_athlete.id, target_athlete.team_id, normalized_notes)
      on conflict (athlete_id) do update
      set notes = excluded.notes;
    end if;
  else
    select t.default_sport_format
    into team_sport
    from public.teams t
    where t.id = target_athlete.team_id;

    if normalized_full_name is null
      or char_length(normalized_full_name) not between 2 and 120
      or (normalized_preferred_name is not null and char_length(normalized_preferred_name) not between 2 and 60)
      or (athlete_birth_date is not null and athlete_birth_date not between date '1900-01-01' and current_date)
      or (normalized_phone is not null and normalized_phone !~ '^\+[1-9][0-9]{7,14}$')
      or (
        normalized_email is not null
        and (
          char_length(normalized_email) > 254
          or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
        )
      )
      or athlete_public_profile is null
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

    update public.athletes
    set
      full_name = normalized_full_name,
      preferred_name = normalized_preferred_name,
      shirt_number = athlete_shirt_number,
      public_profile = athlete_public_profile
    where id = target_athlete.id;

    if athlete_birth_date is null
      and normalized_phone is null
      and normalized_email is null
      and normalized_notes is null
    then
      delete from public.athlete_private
      where athlete_id = target_athlete.id;
    else
      insert into public.athlete_private (
        athlete_id,
        team_id,
        birth_date,
        phone_e164,
        email,
        notes
      )
      values (
        target_athlete.id,
        target_athlete.team_id,
        athlete_birth_date,
        normalized_phone,
        normalized_email,
        normalized_notes
      )
      on conflict (athlete_id) do update
      set
        birth_date = excluded.birth_date,
        phone_e164 = excluded.phone_e164,
        email = excluded.email,
        notes = excluded.notes;
    end if;

    delete from public.athlete_position_preferences
    where athlete_id = target_athlete.id;

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
        target_athlete.id,
        target_athlete.team_id,
        team_sport,
        position_code,
        position_priority
      );
    end loop;
  end if;

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_athlete.team_id,
    current_user_id,
    'athletes.admin_update',
    'athletes',
    target_athlete.id::text,
    jsonb_build_object(
      'profile_owner', case when target_athlete.user_id is null then 'team' else 'player' end,
      'team_fields', jsonb_build_array('shirt_number', 'notes')
    )
  );

  return true;
end;
$$;

create or replace function public.remove_athlete_from_team(
  requested_athlete_id uuid
)
returns table (
  removal_outcome text,
  removed_photo_path text
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_athlete public.athletes%rowtype;
  has_sporting_history boolean;
begin
  select a.*
  into target_athlete
  from public.athletes a
  where a.id = requested_athlete_id
  for update;

  if target_athlete.id is null
    or current_user_id is null
    or not private.is_team_staff(
      target_athlete.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Team owner or admin access required' using errcode = '42501';
  end if;

  if target_athlete.removed_at is not null then
    raise exception 'Athlete relationship is already removed' using errcode = '55000';
  end if;

  select
    exists (
      select 1
      from public.match_incidents incident
      where incident.athlete_id = target_athlete.id
        or incident.assist_athlete_id = target_athlete.id
    )
    or exists (
      select 1
      from public.event_attendance attendance
      join public.events event on event.id = attendance.event_id
      where attendance.athlete_id = target_athlete.id
        and attendance.status <> 'pending'
        and (event.starts_at <= now() or event.status = 'completed')
    )
    or exists (
      select 1
      from public.lineup_spots spot
      join public.events event on event.id = spot.event_id
      where spot.athlete_id = target_athlete.id
        and (event.starts_at <= now() or event.status = 'completed')
    )
  into has_sporting_history;

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_athlete.team_id,
    current_user_id,
    'athletes.relationship_removed',
    'athletes',
    target_athlete.id::text,
    jsonb_build_object(
      'outcome', case when has_sporting_history then 'archived' else 'deleted' end,
      'had_user_link', target_athlete.user_id is not null,
      'registration_number', target_athlete.registration_number
    )
  );

  if has_sporting_history then
    delete from public.lineup_spots spot
    using public.events event
    where spot.event_id = event.id
      and spot.athlete_id = target_athlete.id
      and event.status = 'scheduled'
      and event.starts_at > now();

    delete from public.event_attendance attendance
    using public.events event
    where attendance.event_id = event.id
      and attendance.athlete_id = target_athlete.id
      and event.status = 'scheduled'
      and event.starts_at > now();

    delete from public.notification_outbox
    where athlete_id = target_athlete.id;

    delete from public.communication_consents
    where athlete_id = target_athlete.id;

    delete from public.athlete_position_preferences
    where athlete_id = target_athlete.id;

    delete from public.athlete_private
    where athlete_id = target_athlete.id;

    update public.athletes
    set
      user_id = null,
      status = 'inactive',
      public_profile = false,
      photo_path = null,
      removed_at = now(),
      removed_by = current_user_id
    where id = target_athlete.id;

    return query select 'archived'::text, target_athlete.photo_path;
  else
    delete from public.athletes
    where id = target_athlete.id;

    return query select 'deleted'::text, target_athlete.photo_path;
  end if;
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
  athlete_removed_at timestamptz;
begin
  select a.team_id, a.removed_at
  into athlete_team_id, athlete_removed_at
  from public.athletes a
  where a.id = requested_athlete_id
  for update;

  if athlete_team_id is null or not private.is_team_staff(athlete_team_id) then
    raise exception 'Team staff access required' using errcode = '42501';
  end if;

  if athlete_removed_at is not null then
    raise exception 'Removed athlete relationships cannot be reactivated' using errcode = '55000';
  end if;

  if next_status not in ('active', 'inactive') then
    raise exception 'Invalid athlete status' using errcode = '22023';
  end if;

  update public.athletes
  set status = next_status
  where id = requested_athlete_id
    and removed_at is null
    and status in ('active', 'inactive');

  if not found then
    raise exception 'Athlete status cannot be changed' using errcode = '55000';
  end if;

  return next_status;
end;
$$;

create or replace function public.list_my_player_team_links()
returns table (
  athlete_id uuid,
  team_id uuid,
  team_name text,
  team_slug text,
  team_timezone text,
  sport_format public.sport_format,
  athlete_status public.athlete_status,
  registration_number bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    t.id,
    t.name,
    t.slug::text,
    t.timezone,
    t.default_sport_format,
    a.status,
    a.registration_number
  from public.athletes a
  join public.teams t on t.id = a.team_id
  where a.user_id = (select auth.uid())
    and a.removed_at is null
  order by (a.status = 'active') desc, t.name;
$$;

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
  and a.removed_at is null
  and (
    (a.user_id is not null and pp.is_public = true)
    or (a.user_id is null and a.public_profile = true)
  )
group by t.slug, t.id, a.id, pp.user_id;

-- All mutations pass through audited security-definer workflows. This closes
-- the direct-table path that could otherwise bypass field ownership rules.
revoke update on public.athletes from authenticated;
revoke update on public.athlete_private from authenticated;
revoke insert, update, delete on public.athlete_position_preferences from authenticated;

revoke all on function public.update_athlete_as_admin(uuid, text, text, integer, date, text, text, boolean, text[], text) from public;
revoke all on function public.remove_athlete_from_team(uuid) from public;
grant execute on function public.update_athlete_as_admin(uuid, text, text, integer, date, text, text, boolean, text[], text) to authenticated;
grant execute on function public.remove_athlete_from_team(uuid) to authenticated;

comment on column public.athletes.removed_at is
  'Marks a terminated team relationship retained only because sporting history exists.';
comment on function public.update_athlete_as_admin(uuid, text, text, integer, date, text, text, boolean, text[], text) is
  'Owner/admin edit workflow. Player-owned identity fields are immutable to team administrators.';
comment on function public.remove_athlete_from_team(uuid) is
  'Terminates one team relationship. Deletes unused records or anonymizes and archives records with sporting history.';
