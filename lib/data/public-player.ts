import "server-only";

import { createPrivilegedClient } from "@/lib/supabase/privileged";
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
  const { data: signedPhoto } = data.photo_path
    ? await createPrivilegedClient().storage
        .from("athlete_avatars")
        .createSignedUrl(data.photo_path, 3600)
    : { data: null };

  return {
    ...data,
    photo_url: signedPhoto?.signedUrl ?? null,
    statistics: statisticRows?.[0] ?? {
      matches_played: 0,
      goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
    },
  };
}
