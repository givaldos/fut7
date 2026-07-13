-- Fut7 initial domain schema.
-- Security baseline: OWASP ASVS 5.0 Level 2 target, deny-by-default grants,
-- tenant isolation with RLS, immutable audit records, and constrained public RPCs.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.team_role as enum ('owner', 'admin', 'manager');
create type public.membership_status as enum ('invited', 'active', 'suspended');
create type public.athlete_status as enum ('pending', 'active', 'inactive', 'rejected');
create type public.registration_source as enum ('admin', 'public_form', 'import');
create type public.sport_format as enum ('field', 'society', 'futsal');
create type public.event_kind as enum (
  'weekly_match',
  'championship',
  'friendly',
  'tournament',
  'training',
  'other'
);
create type public.organization_mode as enum ('single_squad', 'split_teams');
create type public.event_status as enum ('scheduled', 'cancelled', 'completed');
create type public.attendance_status as enum (
  'pending',
  'confirmed',
  'declined',
  'maybe',
  'waitlist'
);
create type public.attendance_source as enum ('web', 'admin', 'whatsapp');
create type public.lineup_slot_kind as enum ('starter', 'substitute');
create type public.message_channel as enum ('whatsapp', 'email', 'push');
create type public.message_status as enum (
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled'
);
create type public.consent_status as enum ('granted', 'revoked');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  slug extensions.citext not null unique check (
    slug::text ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'
  ),
  timezone text not null default 'America/Sao_Paulo' check (
    char_length(timezone) between 3 and 64
  ),
  default_sport_format public.sport_format not null default 'society',
  logo_path text check (logo_path is null or char_length(logo_path) <= 512),
  is_public boolean not null default true,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_memberships (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.team_role not null,
  status public.membership_status not null default 'active',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.positions (
  sport_format public.sport_format not null,
  code text not null check (code ~ '^[A-Z_]{1,16}$'),
  label text not null check (char_length(label) between 2 and 40),
  category text not null check (category in ('goalkeeper', 'defense', 'midfield', 'attack')),
  sort_order smallint not null check (sort_order > 0),
  primary key (sport_format, code)
);

insert into public.positions (sport_format, code, label, category, sort_order)
values
  ('field', 'GK', 'Goleiro', 'goalkeeper', 10),
  ('field', 'CB', 'Zagueiro', 'defense', 20),
  ('field', 'FB', 'Lateral', 'defense', 30),
  ('field', 'DM', 'Volante', 'midfield', 40),
  ('field', 'CM', 'Meio-campo', 'midfield', 50),
  ('field', 'AM', 'Meia-atacante', 'midfield', 60),
  ('field', 'W', 'Ponta', 'attack', 70),
  ('field', 'ST', 'Atacante', 'attack', 80),
  ('society', 'GK', 'Goleiro', 'goalkeeper', 10),
  ('society', 'FIXO', 'Fixo', 'defense', 20),
  ('society', 'ALA', 'Ala', 'midfield', 30),
  ('society', 'MID', 'Meia', 'midfield', 40),
  ('society', 'PIVOT', 'Pivô', 'attack', 50),
  ('society', 'ST', 'Atacante', 'attack', 60),
  ('futsal', 'GK', 'Goleiro', 'goalkeeper', 10),
  ('futsal', 'FIXO', 'Fixo', 'defense', 20),
  ('futsal', 'ALA', 'Ala', 'midfield', 30),
  ('futsal', 'PIVOT', 'Pivô', 'attack', 40);

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  registration_number bigint generated always as identity unique,
  full_name text not null check (char_length(full_name) between 2 and 120),
  preferred_name text check (
    preferred_name is null or char_length(preferred_name) between 2 and 60
  ),
  shirt_number smallint check (shirt_number between 1 and 99),
  status public.athlete_status not null default 'pending',
  registration_source public.registration_source not null default 'admin',
  public_profile boolean not null default false,
  photo_path text check (photo_path is null or char_length(photo_path) <= 512),
  joined_on date,
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id)
);

create unique index athletes_one_user_per_team_idx
  on public.athletes (team_id, user_id)
  where user_id is not null;

create table public.athlete_private (
  athlete_id uuid primary key,
  team_id uuid not null,
  birth_date date check (
    birth_date is null
    or birth_date between date '1900-01-01' and current_date
  ),
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  email extensions.citext check (
    email is null or (char_length(email::text) <= 254 and email::text ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  ),
  privacy_terms_version text check (
    privacy_terms_version is null or char_length(privacy_terms_version) between 1 and 40
  ),
  privacy_terms_accepted_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (athlete_id, team_id)
    references public.athletes (id, team_id) on delete cascade
);

create table public.athlete_position_preferences (
  athlete_id uuid not null,
  team_id uuid not null,
  sport_format public.sport_format not null,
  position_code text not null,
  priority smallint not null check (priority between 1 and 3),
  created_at timestamptz not null default now(),
  primary key (athlete_id, sport_format, priority),
  unique (athlete_id, sport_format, position_code),
  foreign key (athlete_id, team_id)
    references public.athletes (id, team_id) on delete cascade,
  foreign key (sport_format, position_code)
    references public.positions (sport_format, code) on delete restrict
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  address text check (address is null or char_length(address) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id)
);

create table public.event_series (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  kind public.event_kind not null,
  organization_mode public.organization_mode not null default 'single_squad',
  sport_format public.sport_format not null,
  recurrence_rule text not null check (
    char_length(recurrence_rule) between 5 and 500
    and recurrence_rule !~ '[[:cntrl:]]'
  ),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  local_start_time time not null,
  timezone text not null default 'America/Sao_Paulo' check (
    char_length(timezone) between 3 and 64
  ),
  duration_minutes smallint not null check (duration_minutes between 15 and 480),
  attendance_deadline_offset interval not null default interval '2 hours' check (
    attendance_deadline_offset >= interval '0 seconds'
    and attendance_deadline_offset <= interval '30 days'
  ),
  venue_id uuid,
  is_active boolean not null default true,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id),
  foreign key (venue_id, team_id)
    references public.venues (id, team_id) on delete restrict
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  series_id uuid,
  title text not null check (char_length(title) between 2 and 120),
  kind public.event_kind not null,
  organization_mode public.organization_mode not null default 'single_squad',
  sport_format public.sport_format not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  attendance_deadline timestamptz,
  venue_id uuid,
  opponent_name text check (opponent_name is null or char_length(opponent_name) <= 120),
  status public.event_status not null default 'scheduled',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (attendance_deadline is null or attendance_deadline <= starts_at),
  unique (id, team_id),
  unique (id, team_id, sport_format),
  foreign key (series_id, team_id)
    references public.event_series (id, team_id) on delete restrict,
  foreign key (venue_id, team_id)
    references public.venues (id, team_id) on delete restrict
);

create unique index events_series_occurrence_idx
  on public.events (series_id, starts_at)
  where series_id is not null;

create table public.event_attendance (
  event_id uuid not null,
  team_id uuid not null,
  athlete_id uuid not null,
  status public.attendance_status not null default 'pending',
  source public.attendance_source not null default 'web',
  responded_at timestamptz,
  responded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, athlete_id),
  foreign key (event_id, team_id)
    references public.events (id, team_id) on delete cascade,
  foreign key (athlete_id, team_id)
    references public.athletes (id, team_id) on delete cascade
);

create table public.event_squads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  team_id uuid not null,
  sport_format public.sport_format not null,
  name text not null check (char_length(name) between 1 and 60),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order smallint not null default 1 check (sort_order > 0),
  is_official boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name),
  unique (id, team_id, event_id, sport_format),
  foreign key (event_id, team_id, sport_format)
    references public.events (id, team_id, sport_format) on delete cascade
);

create table public.lineup_spots (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null,
  event_id uuid not null,
  team_id uuid not null,
  athlete_id uuid not null,
  sport_format public.sport_format not null,
  position_code text,
  slot_kind public.lineup_slot_kind not null default 'starter',
  sort_order smallint not null default 1 check (sort_order > 0),
  field_x numeric(5, 2) check (field_x between 0 and 100),
  field_y numeric(5, 2) check (field_y between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, athlete_id),
  foreign key (squad_id, team_id, event_id, sport_format)
    references public.event_squads (id, team_id, event_id, sport_format) on delete cascade,
  foreign key (athlete_id, team_id)
    references public.athletes (id, team_id) on delete cascade,
  foreign key (sport_format, position_code)
    references public.positions (sport_format, code) on delete restrict
);

create table public.communication_consents (
  athlete_id uuid not null,
  team_id uuid not null,
  channel public.message_channel not null,
  status public.consent_status not null,
  evidence text not null check (char_length(evidence) between 2 and 500),
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (athlete_id, channel),
  check (
    (status = 'granted' and granted_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  ),
  foreign key (athlete_id, team_id)
    references public.athletes (id, team_id) on delete cascade
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  event_id uuid,
  athlete_id uuid,
  channel public.message_channel not null,
  template_key text not null check (template_key ~ '^[a-z0-9_.-]{2,80}$'),
  recipient text not null check (char_length(recipient) between 3 and 254),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status public.message_status not null default 'pending',
  attempts smallint not null default 0 check (attempts between 0 and 20),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  provider_message_id text check (
    provider_message_id is null or char_length(provider_message_id) <= 255
  ),
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  dedupe_key text not null unique check (char_length(dedupe_key) between 8 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, team_id)
    references public.events (id, team_id) on delete cascade,
  foreign key (athlete_id, team_id)
    references public.athletes (id, team_id) on delete cascade
);

create table public.audit_logs (
  id bigint primary key generated always as identity,
  team_id uuid references public.teams (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action ~ '^[a-z0-9_.-]{2,100}$'),
  entity_type text not null check (entity_type ~ '^[a-z_]{2,80}$'),
  entity_id text not null check (char_length(entity_id) between 1 and 100),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  request_id text check (request_id is null or char_length(request_id) <= 100),
  created_at timestamptz not null default now()
);

create index team_memberships_user_idx
  on public.team_memberships (user_id, status);
create index athletes_team_status_idx
  on public.athletes (team_id, status, preferred_name, full_name);
create index athletes_user_idx
  on public.athletes (user_id) where user_id is not null;
create index events_team_starts_idx
  on public.events (team_id, starts_at desc);
create index attendance_team_event_status_idx
  on public.event_attendance (team_id, event_id, status);
create index squads_event_idx
  on public.event_squads (team_id, event_id, sort_order);
create index outbox_dispatch_idx
  on public.notification_outbox (status, available_at)
  where status in ('pending', 'failed');
create index audit_logs_team_created_idx
  on public.audit_logs (team_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.prevent_column_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
  column_name text;
begin
  for argument_index in 0..tg_nargs - 1 loop
    column_name := tg_argv[argument_index];
    if (old_row -> column_name) is distinct from (new_row -> column_name) then
      raise exception 'Column % is immutable on %.%', column_name, tg_table_schema, tg_table_name
        using errcode = '22023';
    end if;
  end loop;
  return new;
end;
$$;

create or replace function private.try_uuid(candidate text)
returns uuid
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return candidate::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_name text;
begin
  candidate_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, 'Atleta'), '@', 1)
  );

  insert into public.profiles (user_id, display_name)
  values (new.id, left(candidate_name, 100));

  return new;
end;
$$;

create or replace function private.add_team_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_memberships (team_id, user_id, role, status)
  values (new.id, new.created_by, 'owner', 'active');
  return new;
end;
$$;

create or replace function private.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and old.status = 'active'
    and (
      tg_op = 'DELETE'
      or new.role <> 'owner'
      or new.status <> 'active'
    )
    and not exists (
      select 1
      from public.team_memberships tm
      where tm.team_id = old.team_id
        and tm.user_id <> old.user_id
        and tm.role = 'owner'
        and tm.status = 'active'
    )
  then
    raise exception 'A team must keep at least one active owner'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.is_team_staff(
  requested_team_id uuid,
  allowed_roles public.team_role[] default array['owner', 'admin', 'manager']::public.team_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.team_id = requested_team_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'active'
      and tm.role = any (allowed_roles)
  );
$$;

create or replace function private.is_team_player(requested_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.athletes a
    where a.team_id = requested_team_id
      and a.user_id = (select auth.uid())
      and a.status = 'active'
  );
$$;

create or replace function private.can_access_team(requested_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_team_staff(requested_team_id)
    or private.is_team_player(requested_team_id);
$$;

create or replace function private.is_athlete_self(requested_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.athletes a
    where a.id = requested_athlete_id
      and a.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_self_respond(
  requested_event_id uuid,
  requested_athlete_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_athlete_self(requested_athlete_id)
    and exists (
      select 1
      from public.events e
      join public.athletes a
        on a.id = requested_athlete_id
        and a.team_id = e.team_id
        and a.status = 'active'
      where e.id = requested_event_id
        and e.status = 'scheduled'
        and e.starts_at > now()
        and (e.attendance_deadline is null or e.attendance_deadline >= now())
    );
$$;

create or replace function private.audit_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb;
  new_row jsonb;
  row_data jsonb;
  action_name text;
begin
  old_row := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  new_row := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  row_data := case when tg_op = 'DELETE' then old_row else new_row end;
  action_name := lower(tg_table_name) || '.' || lower(tg_op);

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata,
    request_id
  )
  values (
    nullif(row_data ->> 'team_id', '')::uuid,
    (select auth.uid()),
    action_name,
    tg_table_name,
    coalesce(row_data ->> 'id', row_data ->> 'user_id', row_data ->> 'athlete_id', 'unknown'),
    jsonb_strip_nulls(jsonb_build_object(
      'old_status', old_row ->> 'status',
      'new_status', new_row ->> 'status'
    )),
    nullif(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-request-id',
      ''
    )
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
exception
  when others then
    -- Auditing must not make an otherwise valid user operation unavailable.
    raise warning 'Audit write failed for %.%: %', tg_table_schema, tg_table_name, sqlerrm;
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger on_team_created_add_owner
  after insert on public.teams
  for each row execute function private.add_team_owner();

create trigger protect_last_team_owner
  before update or delete on public.team_memberships
  for each row execute function private.protect_last_owner();

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger teams_set_updated_at before update on public.teams
  for each row execute function private.set_updated_at();
create trigger memberships_set_updated_at before update on public.team_memberships
  for each row execute function private.set_updated_at();
create trigger athletes_set_updated_at before update on public.athletes
  for each row execute function private.set_updated_at();
create trigger athlete_private_set_updated_at before update on public.athlete_private
  for each row execute function private.set_updated_at();
create trigger venues_set_updated_at before update on public.venues
  for each row execute function private.set_updated_at();
create trigger event_series_set_updated_at before update on public.event_series
  for each row execute function private.set_updated_at();
create trigger events_set_updated_at before update on public.events
  for each row execute function private.set_updated_at();
create trigger attendance_set_updated_at before update on public.event_attendance
  for each row execute function private.set_updated_at();
create trigger squads_set_updated_at before update on public.event_squads
  for each row execute function private.set_updated_at();
create trigger lineup_set_updated_at before update on public.lineup_spots
  for each row execute function private.set_updated_at();
create trigger consents_set_updated_at before update on public.communication_consents
  for each row execute function private.set_updated_at();
create trigger outbox_set_updated_at before update on public.notification_outbox
  for each row execute function private.set_updated_at();

create trigger teams_immutable_columns before update on public.teams
  for each row execute function private.prevent_column_changes('id', 'created_by');
create trigger memberships_immutable_columns before update on public.team_memberships
  for each row execute function private.prevent_column_changes('team_id', 'user_id');
create trigger athletes_immutable_columns before update on public.athletes
  for each row execute function private.prevent_column_changes(
    'id', 'team_id', 'registration_number', 'created_by'
  );
create trigger athlete_private_immutable_columns before update on public.athlete_private
  for each row execute function private.prevent_column_changes('athlete_id', 'team_id');
create trigger preferences_immutable_columns before update on public.athlete_position_preferences
  for each row execute function private.prevent_column_changes('athlete_id', 'team_id');
create trigger venues_immutable_columns before update on public.venues
  for each row execute function private.prevent_column_changes('id', 'team_id');
create trigger series_immutable_columns before update on public.event_series
  for each row execute function private.prevent_column_changes('id', 'team_id', 'created_by');
create trigger events_immutable_columns before update on public.events
  for each row execute function private.prevent_column_changes('id', 'team_id', 'created_by');
create trigger attendance_immutable_columns before update on public.event_attendance
  for each row execute function private.prevent_column_changes('event_id', 'team_id', 'athlete_id');
create trigger squads_immutable_columns before update on public.event_squads
  for each row execute function private.prevent_column_changes(
    'id', 'event_id', 'team_id', 'sport_format'
  );
create trigger lineup_immutable_columns before update on public.lineup_spots
  for each row execute function private.prevent_column_changes(
    'id', 'squad_id', 'event_id', 'team_id', 'athlete_id', 'sport_format'
  );
create trigger consents_immutable_columns before update on public.communication_consents
  for each row execute function private.prevent_column_changes('athlete_id', 'team_id', 'channel');
create trigger outbox_immutable_columns before update on public.notification_outbox
  for each row execute function private.prevent_column_changes(
    'id', 'team_id', 'event_id', 'athlete_id', 'dedupe_key'
  );

create trigger audit_team_memberships
  after insert or update or delete on public.team_memberships
  for each row execute function private.audit_status_change();
create trigger audit_athletes
  after insert or update or delete on public.athletes
  for each row execute function private.audit_status_change();
create trigger audit_events
  after insert or update or delete on public.events
  for each row execute function private.audit_status_change();
create trigger audit_attendance
  after insert or update or delete on public.event_attendance
  for each row execute function private.audit_status_change();

revoke all on function private.set_updated_at() from public;
revoke all on function private.prevent_column_changes() from public;
revoke all on function private.try_uuid(text) from public;
revoke all on function private.handle_new_user() from public;
revoke all on function private.add_team_owner() from public;
revoke all on function private.protect_last_owner() from public;
revoke all on function private.audit_status_change() from public;
revoke all on function private.is_team_staff(uuid, public.team_role[]) from public;
revoke all on function private.is_team_player(uuid) from public;
revoke all on function private.can_access_team(uuid) from public;
revoke all on function private.is_athlete_self(uuid) from public;
revoke all on function private.can_self_respond(uuid, uuid) from public;
grant execute on function private.is_team_staff(uuid, public.team_role[]) to authenticated;
grant execute on function private.is_team_player(uuid) to authenticated;
grant execute on function private.can_access_team(uuid) to authenticated;
grant execute on function private.is_athlete_self(uuid) to authenticated;
grant execute on function private.can_self_respond(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.positions enable row level security;
alter table public.athletes enable row level security;
alter table public.athlete_private enable row level security;
alter table public.athlete_position_preferences enable row level security;
alter table public.venues enable row level security;
alter table public.event_series enable row level security;
alter table public.events enable row level security;
alter table public.event_attendance enable row level security;
alter table public.event_squads enable row level security;
alter table public.lineup_spots enable row level security;
alter table public.communication_consents enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy teams_select_accessible on public.teams
  for select to authenticated
  using (private.can_access_team(id));
create policy teams_insert_owner on public.teams
  for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy teams_update_admin on public.teams
  for update to authenticated
  using (private.is_team_staff(id, array['owner', 'admin']::public.team_role[]))
  with check (private.is_team_staff(id, array['owner', 'admin']::public.team_role[]));

create policy memberships_select_staff on public.team_memberships
  for select to authenticated
  using (private.is_team_staff(team_id));
create policy memberships_insert_owner on public.team_memberships
  for insert to authenticated
  with check (private.is_team_staff(team_id, array['owner']::public.team_role[]));
create policy memberships_insert_admin_non_owner on public.team_memberships
  for insert to authenticated
  with check (
    role <> 'owner'
    and private.is_team_staff(team_id, array['admin']::public.team_role[])
  );
create policy memberships_update_owner on public.team_memberships
  for update to authenticated
  using (private.is_team_staff(team_id, array['owner']::public.team_role[]))
  with check (private.is_team_staff(team_id, array['owner']::public.team_role[]));
create policy memberships_update_admin_non_owner on public.team_memberships
  for update to authenticated
  using (
    role <> 'owner'
    and private.is_team_staff(team_id, array['admin']::public.team_role[])
  )
  with check (
    role <> 'owner'
    and private.is_team_staff(team_id, array['admin']::public.team_role[])
  );

create policy positions_read_all on public.positions
  for select to anon, authenticated
  using (true);

create policy athletes_select_team on public.athletes
  for select to authenticated
  using (private.can_access_team(team_id));
create policy athletes_insert_staff on public.athletes
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.is_team_staff(team_id)
  );
create policy athletes_update_staff on public.athletes
  for update to authenticated
  using (private.is_team_staff(team_id))
  with check (private.is_team_staff(team_id));

create policy athlete_private_select_authorized on public.athlete_private
  for select to authenticated
  using (
    private.is_team_staff(team_id)
    or private.is_athlete_self(athlete_id)
  );
create policy athlete_private_insert_staff on public.athlete_private
  for insert to authenticated
  with check (private.is_team_staff(team_id));
create policy athlete_private_update_authorized on public.athlete_private
  for update to authenticated
  using (
    private.is_team_staff(team_id)
    or private.is_athlete_self(athlete_id)
  )
  with check (
    private.is_team_staff(team_id)
    or private.is_athlete_self(athlete_id)
  );

create policy preferences_select_team on public.athlete_position_preferences
  for select to authenticated
  using (private.can_access_team(team_id));
create policy preferences_insert_staff on public.athlete_position_preferences
  for insert to authenticated
  with check (
    private.is_team_staff(team_id)
    or private.is_athlete_self(athlete_id)
  );
create policy preferences_update_authorized on public.athlete_position_preferences
  for update to authenticated
  using (
    private.is_team_staff(team_id)
    or private.is_athlete_self(athlete_id)
  )
  with check (
    private.is_team_staff(team_id)
    or private.is_athlete_self(athlete_id)
  );
create policy preferences_delete_authorized on public.athlete_position_preferences
  for delete to authenticated
  using (
    private.is_team_staff(team_id)
    or private.is_athlete_self(athlete_id)
  );

create policy venues_select_team on public.venues
  for select to authenticated
  using (private.can_access_team(team_id));
create policy venues_insert_staff on public.venues
  for insert to authenticated
  with check (private.is_team_staff(team_id));
create policy venues_update_staff on public.venues
  for update to authenticated
  using (private.is_team_staff(team_id))
  with check (private.is_team_staff(team_id));

create policy series_select_staff on public.event_series
  for select to authenticated
  using (private.is_team_staff(team_id));
create policy series_insert_staff on public.event_series
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.is_team_staff(team_id)
  );
create policy series_update_staff on public.event_series
  for update to authenticated
  using (private.is_team_staff(team_id))
  with check (private.is_team_staff(team_id));

create policy events_select_team on public.events
  for select to authenticated
  using (private.can_access_team(team_id));
create policy events_insert_staff on public.events
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.is_team_staff(team_id)
  );
create policy events_update_staff on public.events
  for update to authenticated
  using (private.is_team_staff(team_id))
  with check (private.is_team_staff(team_id));

create policy attendance_select_team on public.event_attendance
  for select to authenticated
  using (private.can_access_team(team_id));
create policy attendance_insert_staff on public.event_attendance
  for insert to authenticated
  with check (private.is_team_staff(team_id));
create policy attendance_update_staff on public.event_attendance
  for update to authenticated
  using (private.is_team_staff(team_id))
  with check (private.is_team_staff(team_id));
create policy attendance_update_self on public.event_attendance
  for update to authenticated
  using (private.can_self_respond(event_id, athlete_id))
  with check (
    private.can_self_respond(event_id, athlete_id)
    and source = 'web'
    and responded_by = (select auth.uid())
    and status in ('confirmed', 'declined', 'maybe')
    and responded_at is not null
  );

create policy squads_select_team on public.event_squads
  for select to authenticated
  using (private.can_access_team(team_id));
create policy squads_insert_staff on public.event_squads
  for insert to authenticated
  with check (private.is_team_staff(team_id));
create policy squads_update_staff on public.event_squads
  for update to authenticated
  using (private.is_team_staff(team_id))
  with check (private.is_team_staff(team_id));
create policy squads_delete_staff on public.event_squads
  for delete to authenticated
  using (private.is_team_staff(team_id));

create policy lineup_select_team on public.lineup_spots
  for select to authenticated
  using (private.can_access_team(team_id));
create policy lineup_insert_staff on public.lineup_spots
  for insert to authenticated
  with check (private.is_team_staff(team_id));
create policy lineup_update_staff on public.lineup_spots
  for update to authenticated
  using (private.is_team_staff(team_id))
  with check (private.is_team_staff(team_id));
create policy lineup_delete_staff on public.lineup_spots
  for delete to authenticated
  using (private.is_team_staff(team_id));

create policy consents_select_authorized on public.communication_consents
  for select to authenticated
  using (
    private.is_team_staff(team_id)
    or private.is_athlete_self(athlete_id)
  );
create policy consents_insert_self on public.communication_consents
  for insert to authenticated
  with check (private.is_athlete_self(athlete_id));
create policy consents_update_self on public.communication_consents
  for update to authenticated
  using (private.is_athlete_self(athlete_id))
  with check (private.is_athlete_self(athlete_id));

create policy outbox_select_admin on public.notification_outbox
  for select to authenticated
  using (private.is_team_staff(team_id, array['owner', 'admin']::public.team_role[]));

create policy audit_select_admin on public.audit_logs
  for select to authenticated
  using (
    team_id is not null
    and private.is_team_staff(team_id, array['owner', 'admin']::public.team_role[])
  );

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.teams to authenticated;
grant select, insert, update on public.team_memberships to authenticated;
grant select on public.positions to anon, authenticated;
grant select, insert, update on public.athletes to authenticated;
grant usage, select on sequence public.athletes_registration_number_seq to authenticated;
grant select, insert, update on public.athlete_private to authenticated;
grant select, insert, update, delete on public.athlete_position_preferences to authenticated;
grant select, insert, update on public.venues to authenticated;
grant select, insert, update on public.event_series to authenticated;
grant select, insert, update on public.events to authenticated;
grant select, insert, update on public.event_attendance to authenticated;
grant select, insert, update, delete on public.event_squads to authenticated;
grant select, insert, update, delete on public.lineup_spots to authenticated;
grant select, insert, update on public.communication_consents to authenticated;
grant select on public.notification_outbox to authenticated;
grant select on public.audit_logs to authenticated;

create or replace function public.submit_athlete_registration(
  team_slug text,
  full_name text,
  preferred_name text default null,
  birth_date date default null,
  phone_e164 text default null,
  email text default null,
  accepts_privacy_terms boolean default false,
  accepts_whatsapp boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target_team_id uuid;
  new_athlete_id uuid;
  normalized_phone text;
  normalized_email extensions.citext;
begin
  if accepts_privacy_terms is not true then
    raise exception 'Privacy consent is required' using errcode = '22023';
  end if;

  if char_length(trim(full_name)) not between 2 and 120 then
    raise exception 'Invalid registration data' using errcode = '22023';
  end if;

  if preferred_name is not null and char_length(trim(preferred_name)) not between 2 and 60 then
    raise exception 'Invalid registration data' using errcode = '22023';
  end if;

  normalized_phone := nullif(regexp_replace(coalesce(phone_e164, ''), '[[:space:]()-]', '', 'g'), '');
  if normalized_phone is not null and normalized_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Invalid registration data' using errcode = '22023';
  end if;

  normalized_email := nullif(lower(trim(coalesce(email, ''))), '')::extensions.citext;
  if normalized_email is not null and (
    char_length(normalized_email::text) > 254
    or normalized_email::text !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ) then
    raise exception 'Invalid registration data' using errcode = '22023';
  end if;

  if normalized_phone is null and normalized_email is null then
    raise exception 'A contact channel is required' using errcode = '22023';
  end if;

  if birth_date is not null and (
    birth_date < date '1900-01-01'
    or birth_date > current_date
  ) then
    raise exception 'Invalid registration data' using errcode = '22023';
  end if;

  select t.id into target_team_id
  from public.teams t
  where t.slug = lower(trim(team_slug))::extensions.citext
    and t.is_public = true;

  if target_team_id is null then
    raise exception 'Team not found' using errcode = 'P0002';
  end if;

  -- Idempotent response prevents duplicate submissions without revealing
  -- whether a person is already registered to an anonymous caller.
  if exists (
    select 1
    from public.athletes a
    join public.athlete_private ap on ap.athlete_id = a.id
    where a.team_id = target_team_id
      and a.created_at >= now() - interval '24 hours'
      and (
        (normalized_phone is not null and ap.phone_e164 = normalized_phone)
        or (normalized_email is not null and ap.email = normalized_email)
      )
  ) then
    return true;
  end if;

  insert into public.athletes (
    team_id,
    full_name,
    preferred_name,
    status,
    registration_source,
    public_profile
  )
  values (
    target_team_id,
    trim(full_name),
    nullif(trim(preferred_name), ''),
    'pending',
    'public_form',
    false
  )
  returning id into new_athlete_id;

  insert into public.athlete_private (
    athlete_id,
    team_id,
    birth_date,
    phone_e164,
    email,
    privacy_terms_version,
    privacy_terms_accepted_at
  )
  values (
    new_athlete_id,
    target_team_id,
    birth_date,
    normalized_phone,
    normalized_email,
    '2026-07-13',
    now()
  );

  if accepts_whatsapp is true and normalized_phone is not null then
    insert into public.communication_consents (
      athlete_id,
      team_id,
      channel,
      status,
      evidence,
      granted_at
    )
    values (
      new_athlete_id,
      target_team_id,
      'whatsapp',
      'granted',
      'public_registration_form',
      now()
    );
  end if;

  return true;
end;
$$;

revoke all on function public.submit_athlete_registration(
  text, text, text, date, text, text, boolean, boolean
) from public;
grant execute on function public.submit_athlete_registration(
  text, text, text, date, text, text, boolean, boolean
) to service_role;

create view public.public_team_directory
with (security_barrier = true)
as
select
  t.slug::text as slug,
  t.name,
  t.logo_path,
  t.default_sport_format
from public.teams t
where t.is_public = true;

create view public.public_athlete_directory
with (security_barrier = true)
as
select
  t.slug::text as team_slug,
  a.registration_number,
  coalesce(a.preferred_name, a.full_name) as display_name,
  a.shirt_number,
  a.photo_path,
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
left join public.athlete_position_preferences app on app.athlete_id = a.id
left join public.positions p
  on p.sport_format = app.sport_format
  and p.code = app.position_code
where t.is_public = true
  and a.status = 'active'
  and a.public_profile = true
group by t.slug, a.id;

revoke all on public.public_team_directory from public, anon, authenticated;
revoke all on public.public_athlete_directory from public, anon, authenticated;
grant select on public.public_team_directory to anon, authenticated;
grant select on public.public_athlete_directory to anon, authenticated;

-- The bucket is private. Public pages must request short-lived signed URLs from
-- a trusted server route; object names do not grant access.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'athlete_avatars',
  'athlete_avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy athlete_avatars_select_team on storage.objects
  for select to authenticated
  using (
    bucket_id = 'athlete_avatars'
    and private.can_access_team(private.try_uuid((storage.foldername(name))[1]))
  );

create policy athlete_avatars_insert_staff on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'athlete_avatars'
    and private.is_team_staff(private.try_uuid((storage.foldername(name))[1]))
  );

create policy athlete_avatars_update_staff on storage.objects
  for update to authenticated
  using (
    bucket_id = 'athlete_avatars'
    and private.is_team_staff(private.try_uuid((storage.foldername(name))[1]))
  )
  with check (
    bucket_id = 'athlete_avatars'
    and private.is_team_staff(private.try_uuid((storage.foldername(name))[1]))
  );

create policy athlete_avatars_delete_staff on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'athlete_avatars'
    and private.is_team_staff(private.try_uuid((storage.foldername(name))[1]))
  );

comment on schema private is
  'Non-exposed authorization and trigger helpers. Never add private to Supabase exposed schemas.';
comment on table public.athlete_private is
  'PII separated from the roster so player-level access never exposes phone, email, birth date, or notes.';
comment on table public.notification_outbox is
  'Provider-neutral transactional outbox for future WhatsApp/email/push delivery.';
comment on function public.submit_athlete_registration(
  text, text, text, date, text, text, boolean, boolean
) is
  'Narrow privileged RPC called only by the server after Turnstile and input validation. Never expose it to anon.';
