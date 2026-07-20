import "server-only";

import { resolveDashboardDestination } from "@/lib/auth/destination";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { redirect } from "next/navigation";

export const getSessionDestination = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") return null;

  const [
    { data: membership, error: membershipError },
    { data: playerProfile, error: playerProfileError },
  ] = await Promise.all([
    supabase
      .from("team_memberships")
      .select("team_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("player_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (membershipError || playerProfileError) {
    throw new Error("Não foi possível determinar o destino da sessão.");
  }

  return resolveDashboardDestination({
    hasActiveTeamMembership: Boolean(membership),
    hasPlayerProfile: Boolean(playerProfile),
  });
});

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/auth/login");
  }

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});
