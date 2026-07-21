import { UpdatePasswordForm } from "@/components/update-password-form";
import { AuthShell } from "@/components/auth-shell";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = await createClient();
  const [{ data: auth }, cookieStore] = await Promise.all([
    supabase.auth.getClaims(),
    cookies(),
  ]);
  const userId = auth?.claims?.sub;
  if (
    typeof userId !== "string" ||
    cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value !== userId
  ) {
    redirect("/auth/error?reason=recovery");
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <UpdatePasswordForm />
      </div>
    </AuthShell>
  );
}
