import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getPublicPlayer(handle: string) {
  const supabase = await createClient();
  const [{ data, error }, { data: statisticRows, error: statisticsError }] =
    await Promise.all([
      supabase
        .from("public_player_directory")
        .select(
          "handle, display_name, preferred_name, bio, photo_path, positions",
        )
        .eq("handle", handle)
        .maybeSingle(),
      supabase.rpc("get_public_player_statistics", {
        requested_handle: handle,
      }),
    ]);

  if (error || statisticsError) {
    throw new Error("Não foi possível carregar o perfil público.");
  }
  if (!data) return null;

  return {
    ...data,
    statistics: statisticRows?.[0] ?? {
      matches_played: 0,
      goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
    },
  };
}
