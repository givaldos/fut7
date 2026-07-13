import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { redirect } from "next/navigation";

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

