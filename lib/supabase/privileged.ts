import "server-only";

import type { Database } from "@/lib/database.types";
import { getPrivilegedEnv } from "@/lib/env/server";
import { createClient } from "@supabase/supabase-js";

export function createPrivilegedClient() {
  const env = getPrivilegedEnv();

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
