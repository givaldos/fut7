import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthShell } from "@/components/auth-shell";
import { getTurnstileConfig } from "@/lib/env/server";
import { headers } from "next/headers";

export default async function Page() {
  const turnstile = getTurnstileConfig();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <ForgotPasswordForm siteKey={turnstile?.siteKey} nonce={nonce} />
      </div>
    </AuthShell>
  );
}
