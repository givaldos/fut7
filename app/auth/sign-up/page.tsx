import { SignUpForm } from "@/components/sign-up-form";
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
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm siteKey={turnstile?.siteKey} nonce={nonce} />
      </div>
    </div>
  );
}
