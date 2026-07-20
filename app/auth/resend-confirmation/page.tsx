import { ResendConfirmationForm } from "@/components/resend-confirmation-form";
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
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ResendConfirmationForm siteKey={turnstile?.siteKey} nonce={nonce} />
      </div>
    </div>
  );
}
