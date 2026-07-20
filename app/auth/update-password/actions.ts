"use server";

import { passwordUpdateErrorMessage } from "@/lib/auth/messages";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/server";
import { recoveredPasswordSchema } from "@/lib/validation/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type UpdateRecoveredPasswordState = {
  status?: "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export async function updateRecoveredPassword(
  _previousState: UpdateRecoveredPasswordState,
  formData: FormData,
): Promise<UpdateRecoveredPasswordState> {
  const parsed = recoveredPasswordSchema.safeParse({
    password: formData.get("password"),
    repeatPassword: formData.get("repeatPassword"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise a nova senha.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const [{ data: auth, error: authError }, cookieStore] = await Promise.all([
    supabase.auth.getClaims(),
    cookies(),
  ]);
  const userId = auth?.claims?.sub;
  const recoveryUserId = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value;
  if (authError || typeof userId !== "string" || recoveryUserId !== userId) {
    return {
      status: "error",
      message: "Este acesso de recuperação expirou. Solicite um novo link.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", message: passwordUpdateErrorMessage(error.code) };
  }

  cookieStore.delete(PASSWORD_RECOVERY_COOKIE);
  await supabase.auth.signOut({ scope: "global" });
  redirect("/auth/login?password=updated");
}
