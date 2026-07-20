-- Supabase Auth persists phone identifiers without the leading `+` even when
-- the client submits E.164. Canonicalize only after Auth confirms possession.
create or replace function private.current_verified_phone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.phone ~ '^\+[1-9][0-9]{7,14}$' then u.phone
    when u.phone ~ '^[1-9][0-9]{7,14}$' then '+' || u.phone
    else null
  end
  from auth.users u
  where u.id = (select auth.uid())
    and u.phone_confirmed_at is not null
    and u.phone is not null
    and u.phone ~ '^\+?[1-9][0-9]{7,14}$';
$$;

revoke all on function private.current_verified_phone() from public;

comment on function private.current_verified_phone() is
  'Returns the current confirmed Auth phone in canonical E.164, accounting for Supabase storage without a leading plus.';
