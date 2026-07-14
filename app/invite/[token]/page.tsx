import { Button } from "@/components/ui/button";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { BadgeCheck, Clock3, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Convite para administrar um time | FUT7",
  robots: { index: false, follow: false, nocache: true },
};

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export default async function TeamInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let invitation: {
    team_name: string;
    team_slug: string;
    invited_role: "owner" | "admin" | "manager";
    invitation_expires_at: string;
  } | null = null;

  if (TOKEN_PATTERN.test(token)) {
    const supabase = createPrivilegedClient();
    const { data } = await supabase.rpc("get_team_invitation_preview", {
      raw_token: token,
    });
    invitation = data?.[0] ?? null;
  }

  return (
    <main className="grid min-h-svh place-items-center bg-slate-50 p-5 text-slate-950">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="text-sm font-black tracking-[0.14em] text-emerald-800">
          FUT7
        </Link>

        {invitation ? (
          <>
            <div className="mt-8 grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
              <BadgeCheck className="size-7" aria-hidden />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Convite para colaborar
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{invitation.team_name}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Você foi convidado como {invitation.invited_role === "admin" ? "administrador" : "organizador"}.
              Entre com o e-mail que recebeu o convite para revisar e aceitar o acesso.
            </p>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Clock3 className="size-4" aria-hidden /> Convite temporário e de uso único
            </p>
            <div className="mt-7 space-y-3">
              <Button asChild size="lg" className="h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800">
                <Link href="/auth/login">Entrar e revisar convite</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 w-full rounded-xl">
                <Link href="/auth/sign-up">Criar minha conta</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-8 grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-600">
              <ShieldCheck className="size-7" aria-hidden />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Convite indisponível</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Este convite pode ter expirado, sido revogado ou já utilizado.
              Solicite um novo link ao administrador do time.
            </p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link href="/">Voltar ao início</Link>
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
