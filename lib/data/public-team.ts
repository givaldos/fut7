import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

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

