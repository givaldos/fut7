"use server";

import {
  PASSWORD_RECOVERY_COOKIE,
  passwordRecoveryCookieOptions,
} from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const TOKEN_HASH_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;

export async function beginPasswordRecovery(formData: FormData) {
  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");
  if (
    typeof tokenHash !== "string" ||
    !TOKEN_HASH_PATTERN.test(tokenHash) ||
    type !== "recovery"
  ) {
    redirect("/auth/error?reason=recovery");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: tokenHash,
  });
  if (error || !data.user?.id) redirect("/auth/error?reason=recovery");

  const cookieStore = await cookies();
  cookieStore.set(
    PASSWORD_RECOVERY_COOKIE,
    data.user.id,
    passwordRecoveryCookieOptions(),
  );
  redirect("/auth/update-password");
}
