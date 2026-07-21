-- A racha can be organized before the scheduled kick-off. Staff may prepare
-- and register incidents at any time, while athlete confirmation remains
-- mandatory and finalization still cannot happen before the match starts.

drop trigger if exists match_incidents_require_started_match
  on public.match_incidents;

drop function if exists private.require_started_match_incident();

comment on table public.match_incidents is
  'Auditable goals, assists and cards attributed by staff to confirmed athletes; the minute is optional.';
