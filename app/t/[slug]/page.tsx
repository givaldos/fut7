import { Button } from "@/components/ui/button";
import { getPublicAthletes, getPublicTeam } from "@/lib/data/public-team";
import { ArrowRight, BadgeCheck, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PublicTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/.test(slug)) {
    notFound();
  }

  const [team, athletes] = await Promise.all([
    getPublicTeam(slug),
    getPublicAthletes(slug),
  ]);
  if (!team?.name) notFound();

  return (
    <main className="min-h-svh bg-slate-50 pb-12">
      <header className="bg-emerald-950 px-5 pb-16 pt-6 text-white">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-sm font-semibold text-emerald-200">
            FUT7
          </Link>
          <div className="mt-10 flex items-start gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl font-bold">
              {team.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 text-emerald-200">
                <BadgeCheck className="size-4" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Página oficial
                </span>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{team.name}</h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-emerald-100">
                <MapPin className="size-4" aria-hidden />
                {team.default_sport_format === "society"
                  ? "Futebol society"
                  : team.default_sport_format === "futsal"
                    ? "Futsal"
                    : "Futebol de campo"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-8 max-w-3xl space-y-6 px-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Quer jogar com a gente?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Envie seus dados. Um administrador confirma o vínculo antes de você
            aparecer no elenco.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-5 h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
          >
            <Link href={`/t/${slug}/cadastro`}>
              Cadastrar como atleta <ArrowRight aria-hidden />
            </Link>
          </Button>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-950">Elenco público</h2>
            <span className="text-sm text-slate-500">{athletes.length} atletas</span>
          </div>
          {athletes.length ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {athletes.map((athlete) => (
                <li
                  key={athlete.registration_number}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="grid size-10 place-items-center rounded-full bg-emerald-50 font-semibold text-emerald-800">
                    {athlete.shirt_number ?? "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {athlete.display_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      BID FUT7 #{athlete.registration_number}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              O time ainda não publicou seu elenco.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
