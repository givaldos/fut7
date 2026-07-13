import { LogoutButton } from "@/components/logout-button";
import { TeamSwitcher } from "@/components/team-switcher";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Home,
  Plus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function TeamDashboardPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  await requireUser();
  const { teamSlug } = await params;
  const supabase = await createClient();
  const [{ data: currentTeam }, { data: teams }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, slug, default_sport_format, timezone")
      .eq("slug", teamSlug)
      .maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);
  if (!currentTeam) notFound();

  const now = new Date().toISOString();
  const [{ count: athleteCount }, { data: nextEvent }] = await Promise.all([
    supabase
      .from("athletes")
      .select("id", { count: "exact", head: true })
      .eq("team_id", currentTeam.id)
      .eq("status", "active"),
    supabase
      .from("events")
      .select("id, title, starts_at, sport_format")
      .eq("team_id", currentTeam.id)
      .eq("status", "scheduled")
      .gte("starts_at", now)
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <main className="min-h-svh bg-slate-50 pb-24 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-black tracking-[0.14em] text-emerald-800">
              FUT7
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <TeamSwitcher currentName={currentTeam.name} teams={teams ?? []} />
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        <section className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Painel do time
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              O que vem agora
            </h1>
          </div>
          <button
            className="grid size-11 place-items-center rounded-full bg-emerald-700 text-white shadow-sm"
            aria-label="Criar novo evento"
            type="button"
          >
            <Plus aria-hidden />
          </button>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-3xl bg-emerald-950 p-6 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <CalendarDays className="size-6 text-emerald-300" aria-hidden />
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-emerald-100">
                Próximo evento
              </span>
            </div>
            {nextEvent ? (
              <>
                <h2 className="mt-8 text-xl font-semibold">{nextEvent.title}</h2>
                <p className="mt-2 text-sm text-emerald-100">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "full",
                    timeStyle: "short",
                    timeZone: currentTeam.timezone,
                  }).format(new Date(nextEvent.starts_at))}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-8 text-xl font-semibold">Agenda livre</h2>
                <p className="mt-2 text-sm text-emerald-100">
                  Crie o primeiro jogo ou racha do time.
                </p>
              </>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <UsersRound className="size-6 text-emerald-700" aria-hidden />
            <p className="mt-8 text-4xl font-bold tracking-tight">{athleteCount ?? 0}</p>
            <p className="mt-1 text-sm text-slate-600">atletas ativos no BID do time</p>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Atalhos</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              [UsersRound, "Atletas"],
              [CheckCircle2, "Presenças"],
              [ClipboardList, "Escalar"],
            ].map(([Icon, label]) => {
              const ShortcutIcon = Icon as typeof UsersRound;
              return (
                <button
                  key={label as string}
                  type="button"
                  className="rounded-2xl bg-slate-50 px-2 py-4 text-center text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
                >
                  <ShortcutIcon className="mx-auto mb-2 size-5" aria-hidden />
                  {label as string}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {[
            [Home, "Início"],
            [UsersRound, "Atletas"],
            [CalendarDays, "Agenda"],
            [ClipboardList, "Escala"],
          ].map(([Icon, label], index) => {
            const NavIcon = Icon as typeof Home;
            return (
              <button
                key={label as string}
                type="button"
                className={`flex flex-col items-center gap-1 py-1 text-[10px] ${index === 0 ? "font-semibold text-emerald-800" : "text-slate-500"}`}
              >
                <NavIcon className="size-5" aria-hidden />
                {label as string}
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
