import "server-only";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

type PublicUpcomingEvent = {
  event_id: string;
  team_timezone: string;
  title: string;
  kind: Database["public"]["Enums"]["event_kind"];
  sport_format: Database["public"]["Enums"]["sport_format"];
  starts_at: string;
  ends_at: string;
  attendance_deadline: string | null;
  opponent_name: string | null;
};

export const getPublicTeam = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_team_directory")
    .select("slug, name, logo_path, default_sport_format")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar a página pública do time.");
  }

  return data;
});

export async function getPublicAthletes(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_athlete_directory")
    .select("registration_number, display_name, shirt_number, positions")
    .eq("team_slug", slug)
    .order("display_name");

  if (error) {
    throw new Error("Não foi possível carregar o elenco público.");
  }

  return data ?? [];
}

export async function getPublicUpcomingEvents(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_team_upcoming_events")
    .select("event_id, team_timezone, title, kind, sport_format, starts_at, ends_at, attendance_deadline, opponent_name")
    .eq("team_slug", slug)
    .order("starts_at")
    .limit(8);

  if (error) {
    throw new Error("Não foi possível carregar a agenda pública do time.");
  }

  return (data ?? []).flatMap((event): PublicUpcomingEvent[] => {
    if (
      !event.event_id ||
      !event.team_timezone ||
      !event.title ||
      !event.kind ||
      !event.sport_format ||
      !event.starts_at ||
      !event.ends_at
    ) {
      return [];
    }

    return [{
      event_id: event.event_id,
      team_timezone: event.team_timezone,
      title: event.title,
      kind: event.kind,
      sport_format: event.sport_format,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      attendance_deadline: event.attendance_deadline,
      opponent_name: event.opponent_name,
    }];
  });
}

export async function getPublicPositions(
  sportFormat: "field" | "society" | "futsal",
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("positions")
    .select("code, label")
    .eq("sport_format", sportFormat)
    .order("sort_order");

  if (error) {
    throw new Error("Não foi possível carregar as posições.");
  }

  return data ?? [];
}
