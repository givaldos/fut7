-- Storage object policies parse the first path segment before checking team
-- membership. RLS expressions run with the caller's privileges, so the
-- authenticated role needs access to this non-mutating parser. The private
-- schema remains outside the Supabase API surface and no data access is added.

revoke all on function private.try_uuid(text) from public, anon;
grant execute on function private.try_uuid(text) to authenticated;

comment on function private.try_uuid(text) is
  'Safely parses storage path segments for RLS; executable only by authenticated callers.';
