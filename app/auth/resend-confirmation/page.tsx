import { ResendConfirmationForm } from "@/components/resend-confirmation-form";
import { AuthShell } from "@/components/auth-shell";
import { getSessionDestination } from "@/lib/auth/dal";
import { getTurnstileConfig } from "@/lib/env/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ResendConfirmationPage() {
  const destination = await getSessionDestination();
  if (destination) redirect(destination);

  const turnstile = getTurnstileConfig();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <ResendConfirmationForm siteKey={turnstile?.siteKey} nonce={nonce} />
      </div>
    </AuthShell>
  );
}
