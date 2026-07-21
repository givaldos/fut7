import { SignUpForm } from "@/components/sign-up-form";
import { AuthShell } from "@/components/auth-shell";
import { getSessionDestination } from "@/lib/auth/dal";
import { getTurnstileConfig } from "@/lib/env/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const sessionDestination = await getSessionDestination();
  if (sessionDestination) redirect(sessionDestination);

  const turnstile = getTurnstileConfig();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <SignUpForm siteKey={turnstile?.siteKey} nonce={nonce} />
      </div>
    </AuthShell>
  );
}
