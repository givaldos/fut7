-- Serialize incident corrections with score saves and new match incidents.

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

  perform 1
  from public.events event
  where event.id = target_incident.event_id
  for update;

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

revoke all on function public.delete_match_incident_as_staff(uuid) from public, anon, authenticated;
grant execute on function public.delete_match_incident_as_staff(uuid) to authenticated;

comment on function public.delete_match_incident_as_staff(uuid) is
  'Corrects an audited incident while serializing the associated score update.';
