-- Match reports and athlete statistics for materialized event occurrences.
-- Statistics are derived only from finalized reports on completed events.

create type public.match_incident_kind as enum (
  'goal',
  'yellow_card',
  'red_card'
);

create table public.match_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  team_id uuid not null,
  side_a_label text not null default 'Time A' check (
    char_length(side_a_label) between 1 and 60
  ),
  side_b_label text not null default 'Time B' check (
    char_length(side_b_label) between 1 and 60
  ),
  side_a_score smallint not null default 0 check (side_a_score between 0 and 99),
  side_b_score smallint not null default 0 check (side_b_score between 0 and 99),
  notes text check (notes is null or char_length(notes) <= 2000),
  finalized_at timestamptz,
  finalized_by uuid references auth.users (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id),
  unique (event_id, team_id),
  foreign key (event_id, team_id)
    references public.events (id, team_id) on delete cascade,
  check (
    (finalized_at is null and finalized_by is null)
    or (finalized_at is not null and finalized_by is not null)
  )
);

create table public.match_incidents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  team_id uuid not null,
  kind public.match_incident_kind not null,
  athlete_id uuid not null,
  assist_athlete_id uuid,
  scoring_side smallint check (scoring_side in (1, 2)),
  minute smallint check (minute between 1 and 300),
  notes text check (notes is null or char_length(notes) <= 200),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, team_id)
    references public.events (id, team_id) on delete cascade,
  foreign key (athlete_id, team_id)
    references public.athletes (id, team_id) on delete restrict,
  foreign key (assist_athlete_id, team_id)
    references public.athletes (id, team_id) on delete restrict,
  check (assist_athlete_id is null or assist_athlete_id <> athlete_id),
  check (
    (
      kind = 'goal'
      and scoring_side is not null
    )
    or (
      kind in ('yellow_card', 'red_card')
      and scoring_side is null
      and assist_athlete_id is null
    )
  )
);

create index match_reports_team_finalized_idx
  on public.match_reports (team_id, finalized_at desc);
create index match_incidents_event_created_idx
  on public.match_incidents (event_id, minute, created_at);
create index match_incidents_athlete_kind_idx
  on public.match_incidents (athlete_id, kind);
create index match_incidents_assist_idx
  on public.match_incidents (assist_athlete_id)
  where assist_athlete_id is not null;

create trigger match_reports_set_updated_at
  before update on public.match_reports
  for each row execute function private.set_updated_at();
create trigger match_incidents_set_updated_at
  before update on public.match_incidents
  for each row execute function private.set_updated_at();

create trigger match_reports_immutable_columns
  before update on public.match_reports
  for each row execute function private.prevent_column_changes(
    'id', 'event_id', 'team_id', 'created_by'
  );
create trigger match_incidents_immutable_columns
  before update on public.match_incidents
  for each row execute function private.prevent_column_changes(
    'id', 'event_id', 'team_id', 'created_by'
  );

create trigger audit_match_reports
  after insert or update or delete on public.match_reports
  for each row execute function private.audit_status_change();
create trigger audit_match_incidents
  after insert or update or delete on public.match_incidents
  for each row execute function private.audit_status_change();

alter table public.match_reports enable row level security;
alter table public.match_incidents enable row level security;

create policy match_reports_select_team on public.match_reports
  for select to authenticated
  using (private.can_access_team(team_id));
create policy match_incidents_select_team on public.match_incidents
  for select to authenticated
  using (private.can_access_team(team_id));

revoke all on public.match_reports from public, anon, authenticated;
revoke all on public.match_incidents from public, anon, authenticated;
grant select on public.match_reports to authenticated;
grant select on public.match_incidents to authenticated;

create or replace function public.save_match_report_as_staff(
  requested_event_id uuid,
  requested_side_a_label text,
  requested_side_b_label text,
  requested_side_a_score integer,
  requested_side_b_score integer,
  requested_notes text default null,
  should_finalize boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  normalized_side_a_label text := trim(requested_side_a_label);
  normalized_side_b_label text := trim(requested_side_b_label);
  normalized_notes text := nullif(trim(requested_notes), '');
  report_id uuid;
  side_a_logged_goals integer;
  side_b_logged_goals integer;
begin
  select e.*
  into target_event
  from public.events e
  where e.id = requested_event_id
  for update;

  if target_event.id is null
    or current_user_id is null
    or not private.is_team_staff(target_event.team_id)
  then
    raise exception 'Match report update not allowed' using errcode = '42501';
  end if;

  if target_event.status not in ('scheduled', 'completed') then
    raise exception 'Cancelled events cannot receive a match report' using errcode = '55000';
  end if;

  if normalized_side_a_label is null
    or char_length(normalized_side_a_label) not between 1 and 60
    or normalized_side_b_label is null
    or char_length(normalized_side_b_label) not between 1 and 60
    or requested_side_a_score is null
    or requested_side_a_score not between 0 and 99
    or requested_side_b_score is null
    or requested_side_b_score not between 0 and 99
    or (normalized_notes is not null and char_length(normalized_notes) > 2000)
    or should_finalize is null
  then
    raise exception 'Invalid match report data' using errcode = '22023';
  end if;

  select
    count(*) filter (where incident.scoring_side = 1),
    count(*) filter (where incident.scoring_side = 2)
  into side_a_logged_goals, side_b_logged_goals
  from public.match_incidents incident
  where incident.event_id = target_event.id
    and incident.kind = 'goal';

  if requested_side_a_score < side_a_logged_goals
    or requested_side_b_score < side_b_logged_goals
  then
    raise exception 'Score cannot be lower than logged goals' using errcode = '23514';
  end if;

  if should_finalize and target_event.starts_at > now() then
    raise exception 'A future match cannot be finalized' using errcode = '55000';
  end if;

  insert into public.match_reports (
    event_id,
    team_id,
    side_a_label,
    side_b_label,
    side_a_score,
    side_b_score,
    notes,
    finalized_at,
    finalized_by,
    created_by
  )
  values (
    target_event.id,
    target_event.team_id,
    normalized_side_a_label,
    normalized_side_b_label,
    requested_side_a_score,
    requested_side_b_score,
    normalized_notes,
    case when should_finalize then now() else null end,
    case when should_finalize then current_user_id else null end,
    current_user_id
  )
  on conflict (event_id) do update
  set
    side_a_label = excluded.side_a_label,
    side_b_label = excluded.side_b_label,
    side_a_score = excluded.side_a_score,
    side_b_score = excluded.side_b_score,
    notes = excluded.notes,
    finalized_at = case
      when should_finalize then coalesce(public.match_reports.finalized_at, now())
      else public.match_reports.finalized_at
    end,
    finalized_by = case
      when should_finalize then coalesce(public.match_reports.finalized_by, current_user_id)
      else public.match_reports.finalized_by
    end
  returning id into report_id;

  if should_finalize then
    update public.events
    set status = 'completed'
    where id = target_event.id;
  end if;

  return report_id;
end;
$$;

create or replace function public.add_match_incident_as_staff(
  requested_event_id uuid,
  incident_kind public.match_incident_kind,
  incident_athlete_id uuid,
  incident_assist_athlete_id uuid default null,
  incident_scoring_side integer default null,
  incident_minute integer default null,
  incident_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  normalized_notes text := nullif(trim(incident_notes), '');
  default_side_a_label text;
  default_side_b_label text;
  new_incident_id uuid;
begin
  select e.*
  into target_event
  from public.events e
  where e.id = requested_event_id
  for update;

  if target_event.id is null
    or current_user_id is null
    or not private.is_team_staff(target_event.team_id)
  then
    raise exception 'Match incident creation not allowed' using errcode = '42501';
  end if;

  if target_event.status not in ('scheduled', 'completed') then
    raise exception 'Cancelled events cannot receive match incidents' using errcode = '55000';
  end if;

  if incident_kind is null
    or incident_athlete_id is null
    or (incident_minute is not null and incident_minute not between 1 and 300)
    or (normalized_notes is not null and char_length(normalized_notes) > 200)
    or (
      incident_kind = 'goal'
      and (
        incident_scoring_side is null
        or incident_scoring_side not in (1, 2)
        or incident_assist_athlete_id = incident_athlete_id
      )
    )
    or (
      incident_kind in ('yellow_card', 'red_card')
      and (incident_scoring_side is not null or incident_assist_athlete_id is not null)
    )
  then
    raise exception 'Invalid match incident data' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.athletes athlete
    join public.event_attendance attendance
      on attendance.athlete_id = athlete.id
      and attendance.event_id = target_event.id
      and attendance.status = 'confirmed'
    where athlete.id = incident_athlete_id
      and athlete.team_id = target_event.team_id
  ) then
    raise exception 'The athlete must be confirmed for this match' using errcode = '55000';
  end if;

  if incident_assist_athlete_id is not null and not exists (
    select 1
    from public.athletes athlete
    join public.event_attendance attendance
      on attendance.athlete_id = athlete.id
      and attendance.event_id = target_event.id
      and attendance.status = 'confirmed'
    where athlete.id = incident_assist_athlete_id
      and athlete.team_id = target_event.team_id
  ) then
    raise exception 'The assisting athlete must be confirmed for this match' using errcode = '55000';
  end if;

  select
    coalesce(
      (
        select squad.name
        from public.event_squads squad
        where squad.event_id = target_event.id
        order by squad.sort_order, squad.created_at
        limit 1
      ),
      'Time A'
    ),
    coalesce(
      (
        select squad.name
        from public.event_squads squad
        where squad.event_id = target_event.id
        order by squad.sort_order, squad.created_at
        offset 1
        limit 1
      ),
      'Time B'
    )
  into default_side_a_label, default_side_b_label;

  insert into public.match_reports (
    event_id,
    team_id,
    side_a_label,
    side_b_label,
    created_by
  )
  values (
    target_event.id,
    target_event.team_id,
    default_side_a_label,
    default_side_b_label,
    current_user_id
  )
  on conflict (event_id) do nothing;

  insert into public.match_incidents (
    event_id,
    team_id,
    kind,
    athlete_id,
    assist_athlete_id,
    scoring_side,
    minute,
    notes,
    created_by
  )
  values (
    target_event.id,
    target_event.team_id,
    incident_kind,
    incident_athlete_id,
    incident_assist_athlete_id,
    incident_scoring_side,
    incident_minute,
    normalized_notes,
    current_user_id
  )
  returning id into new_incident_id;

  if incident_kind = 'goal' then
    update public.match_reports report
    set
      side_a_score = report.side_a_score + case when incident_scoring_side = 1 then 1 else 0 end,
      side_b_score = report.side_b_score + case when incident_scoring_side = 2 then 1 else 0 end
    where report.event_id = target_event.id;
  end if;

  return new_incident_id;
end;
$$;

create or replace function public.delete_match_incident_as_staff(
  requested_incident_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_incident public.match_incidents%rowtype;
begin
  select incident.*
  into target_incident
  from public.match_incidents incident
  where incident.id = requested_incident_id
  for update;

  if target_incident.id is null
    or current_user_id is null
    or not private.is_team_staff(target_incident.team_id)
  then
    raise exception 'Match incident deletion not allowed' using errcode = '42501';
  end if;

  delete from public.match_incidents
  where id = target_incident.id;

  if target_incident.kind = 'goal' then
    update public.match_reports report
    set
      side_a_score = greatest(
        report.side_a_score - case when target_incident.scoring_side = 1 then 1 else 0 end,
        0
      ),
      side_b_score = greatest(
        report.side_b_score - case when target_incident.scoring_side = 2 then 1 else 0 end,
        0
      )
    where report.event_id = target_incident.event_id;
  end if;

  return true;
end;
$$;

create or replace function public.get_my_player_statistics()
returns table (
  matches_played bigint,
  goals bigint,
  assists bigint,
  yellow_cards bigint,
  red_cards bigint
)
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  return query
  select
    (
      select count(distinct report.event_id)
      from public.match_reports report
      join public.events event on event.id = report.event_id
      join public.event_attendance attendance on attendance.event_id = event.id
      join public.athletes athlete
        on athlete.id = attendance.athlete_id
        and athlete.team_id = event.team_id
      where athlete.user_id = current_user_id
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
      where athlete.user_id = current_user_id
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
      where athlete.user_id = current_user_id
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
      where athlete.user_id = current_user_id
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
      where athlete.user_id = current_user_id
        and incident.kind = 'red_card'
        and report.finalized_at is not null
        and event.status = 'completed'
    );
end;
$$;

revoke all on function public.save_match_report_as_staff(uuid, text, text, integer, integer, text, boolean) from public, anon, authenticated;
revoke all on function public.add_match_incident_as_staff(uuid, public.match_incident_kind, uuid, uuid, integer, integer, text) from public, anon, authenticated;
revoke all on function public.delete_match_incident_as_staff(uuid) from public, anon, authenticated;
revoke all on function public.get_my_player_statistics() from public, anon, authenticated;

grant execute on function public.save_match_report_as_staff(uuid, text, text, integer, integer, text, boolean) to authenticated;
grant execute on function public.add_match_incident_as_staff(uuid, public.match_incident_kind, uuid, uuid, integer, integer, text) to authenticated;
grant execute on function public.delete_match_incident_as_staff(uuid) to authenticated;
grant execute on function public.get_my_player_statistics() to authenticated;

comment on table public.match_reports is
  'One administrative match report per event occurrence, including score, notes and finalization.';
comment on table public.match_incidents is
  'Auditable goals, assists and cards attributed to confirmed athletes in one event occurrence.';
comment on function public.get_my_player_statistics() is
  'Returns only the authenticated player aggregate from finalized completed matches.';
