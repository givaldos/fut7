-- Product-led onboarding and administrative team invitations.
-- Invitation secrets are generated in Postgres, stored only as SHA-256 hashes,
-- and accepted through an authenticated, email-bound, row-locked RPC.

create type public.team_invitation_status as enum (
  'pending',
  'accepted',
  'declined',
  'revoked',
  'expired'
);

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  email extensions.citext not null check (
    char_length(email::text) <= 254
    and email::text ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  role public.team_role not null check (role in ('admin', 'manager')),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  status public.team_invitation_status not null default 'pending',
  expires_at timestamptz not null check (expires_at > created_at),
  invited_by uuid not null references auth.users (id) on delete restrict,
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'accepted' and accepted_by is not null and accepted_at is not null)
    or (status <> 'accepted' and accepted_at is null)
  )
);

create unique index team_invitations_one_pending_email_idx
  on public.team_invitations (team_id, email)
  where status = 'pending';
create index team_invitations_email_pending_idx
  on public.team_invitations (email, expires_at desc)
  where status = 'pending';
create index team_invitations_team_status_idx
  on public.team_invitations (team_id, status, created_at desc);

create trigger team_invitations_set_updated_at
  before update on public.team_invitations
  for each row execute function private.set_updated_at();
create trigger team_invitations_immutable_columns
  before update on public.team_invitations
  for each row execute function private.prevent_column_changes('id', 'team_id', 'email');
create trigger audit_team_invitations
  after insert or update or delete on public.team_invitations
  for each row execute function private.audit_status_change();

create or replace function private.current_verified_email()
returns extensions.citext
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)::extensions.citext
  from auth.users u
  where u.id = (select auth.uid())
    and u.email_confirmed_at is not null
    and u.email is not null;
$$;

create or replace function public.create_team_invitation(
  requested_team_id uuid,
  invited_email text,
  invited_role public.team_role
)
returns table (
  invitation_id uuid,
  invite_token text,
  invitation_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  normalized_email extensions.citext;
  raw_token text;
  token_digest bytea;
  target_expires_at timestamptz;
  result_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  normalized_email := lower(trim(invited_email))::extensions.citext;
  if char_length(normalized_email::text) > 254
    or normalized_email::text !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  then
    raise exception 'Invalid invitation data' using errcode = '22023';
  end if;

  if invited_role not in ('admin', 'manager') then
    raise exception 'Invalid invitation data' using errcode = '22023';
  end if;

  if normalized_email = private.current_verified_email() then
    raise exception 'Invalid invitation data' using errcode = '22023';
  end if;

  if invited_role = 'admin'
    and not private.is_team_staff(
      requested_team_id,
      array['owner']::public.team_role[]
    )
  then
    raise exception 'Not authorized to invite this role' using errcode = '42501';
  end if;

  if invited_role = 'manager'
    and not private.is_team_staff(
      requested_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Not authorized to invite this role' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.team_memberships tm
    join auth.users u on u.id = tm.user_id
    where tm.team_id = requested_team_id
      and lower(u.email)::extensions.citext = normalized_email
      and tm.status = 'active'
  ) then
    raise exception 'User is already an active team member' using errcode = '23505';
  end if;

  update public.team_invitations i
  set status = 'expired'
  where i.team_id = requested_team_id
    and i.email = normalized_email
    and i.status = 'pending'
    and i.expires_at <= now();

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  token_digest := extensions.digest(raw_token, 'sha256');
  target_expires_at := now() + interval '7 days';

  insert into public.team_invitations (
    team_id,
    email,
    role,
    token_hash,
    expires_at,
    invited_by
  )
  values (
    requested_team_id,
    normalized_email,
    invited_role,
    token_digest,
    target_expires_at,
    (select auth.uid())
  )
  on conflict (team_id, email) where status = 'pending'
  do update set
    role = excluded.role,
    token_hash = excluded.token_hash,
    expires_at = excluded.expires_at,
    invited_by = excluded.invited_by,
    updated_at = now()
  returning id into result_id;

  return query select result_id, raw_token, target_expires_at;
end;
$$;

create or replace function public.list_my_team_invitations()
returns table (
  invitation_id uuid,
  team_name text,
  team_slug text,
  invited_role public.team_role,
  invited_by_name text,
  invitation_created_at timestamptz,
  invitation_expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select
    i.id,
    t.name,
    t.slug::text,
    i.role,
    coalesce(p.display_name, 'Administrador do time'),
    i.created_at,
    i.expires_at
  from public.team_invitations i
  join public.teams t on t.id = i.team_id
  left join public.profiles p on p.user_id = i.invited_by
  where i.email = private.current_verified_email()
    and i.status = 'pending'
    and i.expires_at > now()
  order by i.created_at desc;
$$;

create or replace function public.get_team_invitation_preview(raw_token text)
returns table (
  team_name text,
  team_slug text,
  invited_role public.team_role,
  invitation_expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select
    t.name,
    t.slug::text,
    i.role,
    i.expires_at
  from public.team_invitations i
  join public.teams t on t.id = i.team_id
  where raw_token ~ '^[a-f0-9]{64}$'
    and i.token_hash = extensions.digest(raw_token, 'sha256')
    and i.status = 'pending'
    and i.expires_at > now()
  limit 1;
$$;

create or replace function public.respond_to_team_invitation(
  requested_invitation_id uuid,
  invitation_response text
)
returns text
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_email extensions.citext;
  target_invitation public.team_invitations%rowtype;
  existing_status public.membership_status;
  result_slug text;
begin
  current_email := private.current_verified_email();
  if current_email is null then
    raise exception 'Verified authentication required' using errcode = '42501';
  end if;

  if invitation_response not in ('accept', 'decline') then
    raise exception 'Invalid invitation response' using errcode = '22023';
  end if;

  select i.*
  into target_invitation
  from public.team_invitations i
  where i.id = requested_invitation_id
    and i.email = current_email
    and i.status = 'pending'
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation unavailable' using errcode = '22023';
  end if;

  if invitation_response = 'decline' then
    update public.team_invitations
    set status = 'declined'
    where id = target_invitation.id;
    return null;
  end if;

  select tm.status
  into existing_status
  from public.team_memberships tm
  where tm.team_id = target_invitation.team_id
    and tm.user_id = (select auth.uid())
  for update;

  if existing_status = 'suspended' then
    raise exception 'Invitation unavailable' using errcode = '42501';
  end if;

  if existing_status is null then
    insert into public.team_memberships (
      team_id,
      user_id,
      role,
      status,
      invited_by
    )
    values (
      target_invitation.team_id,
      (select auth.uid()),
      target_invitation.role,
      'active',
      target_invitation.invited_by
    );
  elsif existing_status = 'invited' then
    update public.team_memberships
    set
      role = target_invitation.role,
      status = 'active',
      invited_by = target_invitation.invited_by
    where team_id = target_invitation.team_id
      and user_id = (select auth.uid());
  end if;

  update public.team_invitations
  set
    status = 'accepted',
    accepted_by = (select auth.uid()),
    accepted_at = now()
  where id = target_invitation.id;

  select t.slug::text
  into result_slug
  from public.teams t
  where t.id = target_invitation.team_id;

  return result_slug;
end;
$$;

create or replace function public.revoke_team_invitation(
  requested_invitation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target_team_id uuid;
  target_role public.team_role;
begin
  select i.team_id, i.role
  into target_team_id, target_role
  from public.team_invitations i
  where i.id = requested_invitation_id
    and i.status = 'pending'
  for update;

  if not found then
    return false;
  end if;

  if target_role = 'admin'
    and not private.is_team_staff(target_team_id, array['owner']::public.team_role[])
  then
    raise exception 'Not authorized to revoke this invitation' using errcode = '42501';
  end if;

  if target_role = 'manager'
    and not private.is_team_staff(
      target_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Not authorized to revoke this invitation' using errcode = '42501';
  end if;

  update public.team_invitations
  set status = 'revoked'
  where id = requested_invitation_id;

  return true;
end;
$$;

revoke all on function private.current_verified_email() from public;
revoke all on function public.create_team_invitation(uuid, text, public.team_role) from public;
revoke all on function public.list_my_team_invitations() from public;
revoke all on function public.get_team_invitation_preview(text) from public;
revoke all on function public.respond_to_team_invitation(uuid, text) from public;
revoke all on function public.revoke_team_invitation(uuid) from public;

grant execute on function public.create_team_invitation(uuid, text, public.team_role)
  to authenticated;
grant execute on function public.list_my_team_invitations()
  to authenticated;
grant execute on function public.respond_to_team_invitation(uuid, text)
  to authenticated;
grant execute on function public.revoke_team_invitation(uuid)
  to authenticated;
grant execute on function public.get_team_invitation_preview(text)
  to service_role;

alter table public.team_invitations enable row level security;

create policy team_invitations_select_admin on public.team_invitations
  for select to authenticated
  using (
    private.is_team_staff(
      team_id,
      array['owner', 'admin']::public.team_role[]
    )
  );

revoke all on public.team_invitations from public, anon, authenticated;
grant select on public.team_invitations to authenticated;

comment on table public.team_invitations is
  'Email-bound administrative invitations. Raw invite tokens are never persisted.';
comment on function public.create_team_invitation(uuid, text, public.team_role) is
  'Creates or rotates a seven-day invitation token after enforcing inviter role boundaries.';
comment on function public.respond_to_team_invitation(uuid, text) is
  'Atomically accepts or declines a pending invitation bound to the authenticated verified email.';
