-- Global player identity and passwordless, phone-verified team applications.
-- `player_profiles` belongs to a person; `athletes` remains the approval-bound
-- BID relationship between that person and one team.

create table public.player_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle extensions.citext not null unique check (
    handle::text ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'
  ),
  display_name text not null check (char_length(display_name) between 2 and 100),
  preferred_name text check (
    preferred_name is null or char_length(preferred_name) between 2 and 60
  ),
  bio text check (bio is null or char_length(bio) <= 500),
  birth_date date check (
    birth_date is null or birth_date between date '1900-01-01' and current_date
  ),
  photo_path text check (photo_path is null or char_length(photo_path) <= 512),
  is_public boolean not null default false,
  phone_verified_at timestamptz not null,
  handle_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_position_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  sport_format public.sport_format not null,
  position_code text not null,
  priority smallint not null check (priority between 1 and 3),
  created_at timestamptz not null default now(),
  primary key (user_id, sport_format, priority),
  unique (user_id, sport_format, position_code),
  foreign key (sport_format, position_code)
    references public.positions (sport_format, code) on delete restrict
);

create trigger player_profiles_set_updated_at
  before update on public.player_profiles
  for each row execute function private.set_updated_at();
create trigger player_profiles_immutable_columns
  before update on public.player_profiles
  for each row execute function private.prevent_column_changes('user_id', 'phone_verified_at');

create or replace function private.audit_player_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata,
    request_id
  )
  values (
    (select auth.uid()),
    'player_profiles.' || lower(tg_op),
    'player_profiles',
    new.user_id::text,
    jsonb_build_object(
      'handle_changed', case
        when tg_op = 'UPDATE' then old.handle is distinct from new.handle
        else false
      end,
      'was_public', case when tg_op = 'UPDATE' then old.is_public else null end,
      'is_public', new.is_public
    ),
    nullif(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-request-id',
      ''
    )
  );
  return new;
exception
  when others then
    raise warning 'Player profile audit failed: %', sqlerrm;
    return new;
end;
$$;

create trigger audit_player_profiles
  after insert or update on public.player_profiles
  for each row execute function private.audit_player_profile_change();

alter table public.player_profiles enable row level security;
alter table public.player_position_preferences enable row level security;

create policy player_profiles_select_self on public.player_profiles
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy player_positions_select_self on public.player_position_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.player_profiles to authenticated;
grant select on public.player_position_preferences to authenticated;

create or replace function private.current_verified_phone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.phone
  from auth.users u
  where u.id = (select auth.uid())
    and u.phone_confirmed_at is not null
    and u.phone is not null
    and u.phone ~ '^\+[1-9][0-9]{7,14}$';
$$;

create or replace function public.complete_verified_athlete_registration(
  team_slug text,
  full_name text,
  preferred_name text,
  birth_date text,
  accepts_privacy_terms boolean,
  accepts_whatsapp boolean,
  position_codes text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  verified_phone text := private.current_verified_phone();
  normalized_full_name text := trim(full_name);
  normalized_preferred_name text := nullif(trim(preferred_name), '');
  normalized_birth_date date;
  requested_positions text[] := coalesce(position_codes, '{}'::text[]);
  target_team_id uuid;
  target_sport public.sport_format;
  target_athlete_id uuid;
  generated_handle text;
  position_code text;
  position_priority smallint := 0;
begin
  begin
    normalized_birth_date := nullif(trim(birth_date), '')::date;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception 'Invalid player registration' using errcode = '22023';
  end;

  if current_user_id is null or verified_phone is null then
    raise exception 'Verified phone authentication required' using errcode = '42501';
  end if;

  if accepts_privacy_terms is not true
    or char_length(normalized_full_name) not between 2 and 100
    or (normalized_preferred_name is not null and char_length(normalized_preferred_name) not between 2 and 60)
    or (normalized_birth_date is not null and normalized_birth_date not between date '1900-01-01' and current_date)
    or coalesce(array_length(requested_positions, 1), 0) > 3
    or (
      select count(*) <> count(distinct candidate)
      from unnest(requested_positions) candidate
    )
  then
    raise exception 'Invalid player registration' using errcode = '22023';
  end if;

  select t.id, t.default_sport_format
  into target_team_id, target_sport
  from public.teams t
  where t.slug = lower(trim(team_slug))::extensions.citext
    and t.is_public = true;

  if target_team_id is null
    or exists (
      select 1
      from unnest(requested_positions) candidate
      where not exists (
        select 1
        from public.positions p
        where p.sport_format = target_sport
          and p.code = candidate
      )
    )
  then
    raise exception 'Invalid player registration' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text || ':' || target_team_id::text, 0)
  );

  generated_handle := 'atleta-' || left(replace(current_user_id::text, '-', ''), 12);

  insert into public.player_profiles (
    user_id,
    handle,
    display_name,
    preferred_name,
    birth_date,
    phone_verified_at
  )
  values (
    current_user_id,
    generated_handle,
    normalized_full_name,
    normalized_preferred_name,
    normalized_birth_date,
    now()
  )
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    preferred_name = excluded.preferred_name,
    birth_date = coalesce(excluded.birth_date, public.player_profiles.birth_date);

  update public.profiles
  set display_name = normalized_full_name
  where user_id = current_user_id;

  delete from public.player_position_preferences ppp
  where ppp.user_id = current_user_id
    and ppp.sport_format = target_sport;

  foreach position_code in array requested_positions loop
    position_priority := position_priority + 1;
    insert into public.player_position_preferences (
      user_id,
      sport_format,
      position_code,
      priority
    )
    values (
      current_user_id,
      target_sport,
      position_code,
      position_priority
    );
  end loop;

  select a.id
  into target_athlete_id
  from public.athletes a
  where a.team_id = target_team_id
    and a.user_id = current_user_id
  for update;

  if target_athlete_id is null then
    select a.id
    into target_athlete_id
    from public.athletes a
    join public.athlete_private ap on ap.athlete_id = a.id
    where a.team_id = target_team_id
      and a.user_id is null
      and ap.phone_e164 = verified_phone
    order by (a.status = 'active') desc, a.created_at
    limit 1
    for update of a;
  end if;

  if target_athlete_id is null then
    insert into public.athletes (
      team_id,
      user_id,
      full_name,
      preferred_name,
      status,
      registration_source,
      public_profile
    )
    values (
      target_team_id,
      current_user_id,
      normalized_full_name,
      normalized_preferred_name,
      'pending',
      'public_form',
      false
    )
    returning id into target_athlete_id;
  else
    update public.athletes
    set
      user_id = current_user_id,
      full_name = normalized_full_name,
      preferred_name = normalized_preferred_name
    where id = target_athlete_id;
  end if;

  insert into public.athlete_private (
    athlete_id,
    team_id,
    birth_date,
    phone_e164,
    privacy_terms_version,
    privacy_terms_accepted_at
  )
  values (
    target_athlete_id,
    target_team_id,
    normalized_birth_date,
    verified_phone,
    '2026-07-20',
    now()
  )
  on conflict (athlete_id) do update
  set
    birth_date = coalesce(excluded.birth_date, public.athlete_private.birth_date),
    phone_e164 = excluded.phone_e164,
    privacy_terms_version = excluded.privacy_terms_version,
    privacy_terms_accepted_at = excluded.privacy_terms_accepted_at;

  delete from public.athlete_position_preferences app
  where app.athlete_id = target_athlete_id
    and app.sport_format = target_sport;

  insert into public.athlete_position_preferences (
    athlete_id,
    team_id,
    sport_format,
    position_code,
    priority
  )
  select
    target_athlete_id,
    target_team_id,
    ppp.sport_format,
    ppp.position_code,
    ppp.priority
  from public.player_position_preferences ppp
  where ppp.user_id = current_user_id
    and ppp.sport_format = target_sport;

  if accepts_whatsapp is true then
    insert into public.communication_consents (
      athlete_id,
      team_id,
      channel,
      status,
      evidence,
      granted_at,
      revoked_at
    )
    values (
      target_athlete_id,
      target_team_id,
      'whatsapp',
      'granted',
      'verified_phone_registration',
      now(),
      null
    )
    on conflict (athlete_id, channel) do update
    set
      status = 'granted',
      evidence = excluded.evidence,
      granted_at = excluded.granted_at,
      revoked_at = null;
  end if;

  return target_athlete_id;
end;
$$;

create or replace function public.update_my_player_profile(
  requested_handle text,
  requested_display_name text,
  requested_preferred_name text,
  requested_bio text,
  requested_is_public boolean,
  field_positions text[],
  society_positions text[],
  futsal_positions text[]
)
returns text
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_handle text := lower(trim(requested_handle));
  normalized_display_name text := trim(requested_display_name);
  normalized_preferred_name text := nullif(trim(requested_preferred_name), '');
  normalized_bio text := nullif(trim(requested_bio), '');
  current_handle text;
  last_handle_change timestamptz;
  sport public.sport_format;
  codes text[];
  code text;
  next_priority smallint;
begin
  select pp.handle::text, pp.handle_changed_at
  into current_handle, last_handle_change
  from public.player_profiles pp
  where pp.user_id = current_user_id
  for update;

  if current_handle is null then
    raise exception 'Player profile required' using errcode = '42501';
  end if;

  if normalized_handle !~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'
    or normalized_handle in ('admin', 'app', 'auth', 'api', 'me', 'time', 'times', 'ajuda', 'suporte')
    or char_length(normalized_display_name) not between 2 and 100
    or (normalized_preferred_name is not null and char_length(normalized_preferred_name) not between 2 and 60)
    or (normalized_bio is not null and char_length(normalized_bio) > 500)
  then
    raise exception 'Invalid player profile' using errcode = '22023';
  end if;

  if normalized_handle <> current_handle
    and last_handle_change is not null
    and last_handle_change > now() - interval '30 days'
  then
    raise exception 'Handle change temporarily limited' using errcode = '54000';
  end if;

  foreach sport in array array['field', 'society', 'futsal']::public.sport_format[] loop
    codes := case sport
      when 'field' then coalesce(field_positions, '{}'::text[])
      when 'society' then coalesce(society_positions, '{}'::text[])
      else coalesce(futsal_positions, '{}'::text[])
    end;

    if coalesce(array_length(codes, 1), 0) > 3
      or (select count(*) <> count(distinct candidate) from unnest(codes) candidate)
      or exists (
        select 1
        from unnest(codes) candidate
        where not exists (
          select 1 from public.positions p
          where p.sport_format = sport and p.code = candidate
        )
      )
    then
      raise exception 'Invalid player positions' using errcode = '22023';
    end if;
  end loop;

  update public.player_profiles
  set
    handle = normalized_handle,
    display_name = normalized_display_name,
    preferred_name = normalized_preferred_name,
    bio = normalized_bio,
    is_public = coalesce(requested_is_public, false),
    handle_changed_at = case
      when normalized_handle <> current_handle then now()
      else handle_changed_at
    end
  where user_id = current_user_id;

  update public.profiles
  set display_name = normalized_display_name
  where user_id = current_user_id;

  update public.athletes
  set
    full_name = normalized_display_name,
    preferred_name = normalized_preferred_name,
    public_profile = coalesce(requested_is_public, false)
  where user_id = current_user_id;

  delete from public.player_position_preferences
  where user_id = current_user_id;

  foreach sport in array array['field', 'society', 'futsal']::public.sport_format[] loop
    codes := case sport
      when 'field' then coalesce(field_positions, '{}'::text[])
      when 'society' then coalesce(society_positions, '{}'::text[])
      else coalesce(futsal_positions, '{}'::text[])
    end;
    next_priority := 0;
    foreach code in array codes loop
      next_priority := next_priority + 1;
      insert into public.player_position_preferences (
        user_id, sport_format, position_code, priority
      ) values (current_user_id, sport, code, next_priority);
    end loop;
  end loop;

  delete from public.athlete_position_preferences app
  using public.athletes a
  where app.athlete_id = a.id
    and a.user_id = current_user_id;

  insert into public.athlete_position_preferences (
    athlete_id, team_id, sport_format, position_code, priority
  )
  select a.id, a.team_id, ppp.sport_format, ppp.position_code, ppp.priority
  from public.athletes a
  join public.teams t on t.id = a.team_id
  join public.player_position_preferences ppp on ppp.user_id = a.user_id
    and ppp.sport_format = t.default_sport_format
  where a.user_id = current_user_id;

  return normalized_handle;
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
  order by (a.status = 'active') desc, t.name;
$$;

create or replace function public.respond_to_event_as_player(
  requested_event_id uuid,
  response_status public.attendance_status
)
returns public.attendance_status
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_athlete_id uuid;
begin
  if response_status not in ('confirmed', 'declined', 'maybe') then
    raise exception 'Invalid attendance response' using errcode = '22023';
  end if;

  select a.id
  into target_athlete_id
  from public.events e
  join public.athletes a
    on a.team_id = e.team_id
    and a.user_id = current_user_id
    and a.status = 'active'
  where e.id = requested_event_id
    and e.status = 'scheduled'
    and e.starts_at > now()
    and (e.attendance_deadline is null or e.attendance_deadline >= now());

  if target_athlete_id is null then
    raise exception 'Attendance response not allowed' using errcode = '42501';
  end if;

  update public.event_attendance
  set
    status = response_status,
    source = 'web',
    responded_at = now(),
    responded_by = current_user_id
  where event_id = requested_event_id
    and athlete_id = target_athlete_id;

  if not found then
    raise exception 'Attendance response not available' using errcode = '55000';
  end if;

  return response_status;
end;
$$;

create or replace view public.public_athlete_directory
with (security_barrier = true)
as
select
  t.slug::text as team_slug,
  a.registration_number,
  coalesce(pp.preferred_name, pp.display_name, a.preferred_name, a.full_name) as display_name,
  a.shirt_number,
  coalesce(pp.photo_path, a.photo_path) as photo_path,
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
group by t.slug, a.id, pp.user_id;

create view public.public_player_directory
with (security_barrier = true)
as
select
  pp.handle::text as handle,
  pp.display_name,
  pp.preferred_name,
  pp.bio,
  pp.photo_path,
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

revoke all on public.public_player_directory from public, anon, authenticated;
grant select on public.public_player_directory to anon, authenticated;

revoke all on function private.current_verified_phone() from public;
revoke all on function private.audit_player_profile_change() from public;
revoke all on function public.complete_verified_athlete_registration(text, text, text, text, boolean, boolean, text[]) from public;
revoke all on function public.update_my_player_profile(text, text, text, text, boolean, text[], text[], text[]) from public;
revoke all on function public.list_my_player_team_links() from public;
revoke all on function public.respond_to_event_as_player(uuid, public.attendance_status) from public;

grant execute on function public.complete_verified_athlete_registration(text, text, text, text, boolean, boolean, text[]) to authenticated;
grant execute on function public.update_my_player_profile(text, text, text, text, boolean, text[], text[], text[]) to authenticated;
grant execute on function public.list_my_player_team_links() to authenticated;
grant execute on function public.respond_to_event_as_player(uuid, public.attendance_status) to authenticated;

comment on table public.player_profiles is
  'Global player-owned profile. Team participation remains approval-bound in athletes.';
comment on function public.complete_verified_athlete_registration(text, text, text, text, boolean, boolean, text[]) is
  'Creates or links a per-team BID only after Supabase Auth has verified the current phone identity.';
