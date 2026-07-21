import { AthleteRegistrationForm } from "@/components/athlete-registration-form";
import { getTurnstileConfig } from "@/lib/env/server";
import { getPublicPositions, getPublicTeam } from "@/lib/data/public-team";
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
  if (!team?.default_sport_format) notFound();
  const positions = await getPublicPositions(team.default_sport_format);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const turnstile = getTurnstileConfig();

  return (
    <main className="app-canvas px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-lg">
        <Link
          href={`/t/${slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="size-4" aria-hidden /> Voltar para {team.name}
        </Link>
        <section className="app-surface mt-6 p-5 sm:p-8">
          <p className="app-kicker">
            Cadastro de atleta
          </p>
          <h1 className="app-title mt-3">
            Entre para o {team.name}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Seus dados ficam pendentes até a confirmação de um administrador.
            Informações privadas não aparecem no elenco público.
          </p>
          <div className="my-6 h-px bg-slate-100" />
          <AthleteRegistrationForm
            teamSlug={slug}
            positions={positions}
            siteKey={turnstile?.siteKey}
            nonce={nonce}
          />
        </section>
      </div>
    </main>
  );
}
