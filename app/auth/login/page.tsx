import { AthleteOtpLoginForm } from "@/components/athlete-otp-login-form";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { getSessionDestination } from "@/lib/auth/dal";
import { safeInternalPath } from "@/lib/security/redirects";
import { getTurnstileConfig } from "@/lib/env/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; password?: string }>;
}) {
  const params = await searchParams;
  const sessionDestination = await getSessionDestination();
  if (sessionDestination) {
    redirect(
      params.next
        ? safeInternalPath(params.next, sessionDestination)
        : sessionDestination,
    );
  }

  const turnstile = getTurnstileConfig();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const athleteNextPath = safeInternalPath(params.next, "/me");
  const adminNextPath = safeInternalPath(params.next, "/app");
  return (
    <AuthShell>
      <div className="w-full max-w-sm space-y-5">
        {params.password === "updated" ? (
          <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Senha atualizada. Entre novamente; as sessões anteriores foram encerradas.
          </p>
        ) : null}
        <AthleteOtpLoginForm siteKey={turnstile?.siteKey} nonce={nonce} nextPath={athleteNextPath} />
        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400">
          <div className="h-px flex-1 bg-slate-200" /> Administração <div className="h-px flex-1 bg-slate-200" />
        </div>
        <LoginForm nextPath={adminNextPath} siteKey={turnstile?.siteKey} nonce={nonce} />
      </div>
    </AuthShell>
  );
}
