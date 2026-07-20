import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { getTurnstileConfig } from "@/lib/env/server";
import { headers } from "next/headers";

export default async function Page() {
  const turnstile = getTurnstileConfig();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm siteKey={turnstile?.siteKey} nonce={nonce} />
      </div>
    </div>
  );
}
