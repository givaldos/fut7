import { AthleteRegistrationForm } from "@/components/athlete-registration-form";
import { getTurnstileConfig } from "@/lib/env/server";
import { getPublicTeam } from "@/lib/data/public-team";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function AthleteRegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/.test(slug)) {
    notFound();
  }

  const team = await getPublicTeam(slug);
  if (!team) notFound();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const turnstile = getTurnstileConfig();

  return (
    <main className="min-h-svh bg-slate-50 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-lg">
        <Link
          href={`/t/${slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="size-4" aria-hidden /> Voltar para {team.name}
        </Link>
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Cadastro de atleta
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            Entre para o {team.name}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Seus dados ficam pendentes até a confirmação de um administrador.
            Informações privadas não aparecem no elenco público.
          </p>
          <div className="my-6 h-px bg-slate-100" />
          <AthleteRegistrationForm
            teamSlug={slug}
            siteKey={turnstile?.siteKey}
            nonce={nonce}
          />
        </section>
      </div>
    </main>
  );
}

