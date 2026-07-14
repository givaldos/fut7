import { revokeTeamInvitation } from "@/app/app/team-actions";
import { AdminInviteForm } from "@/components/admin-invite-form";
import { LogoutButton } from "@/components/logout-button";
import { TeamSwitcher } from "@/components/team-switcher";
import { TeamBottomNav } from "@/components/team-bottom-nav";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { getAppUrl } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  ExternalLink,
  MessageCircle,
  Plus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function TeamDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireUser();
  const { teamSlug } = await params;
  const query = await searchParams;
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
  const [
    { count: athleteCount },
    { data: nextEvent },
    { data: membership },
    { data: pendingInvitations },
  ] = await Promise.all([
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
    supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", currentTeam.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("team_invitations")
      .select("id, email, role, expires_at")
      .eq("team_id", currentTeam.id)
      .eq("status", "pending")
      .gt("expires_at", now)
      .order("created_at", { ascending: false }),
  ]);

  const canManageInvitations = membership?.role === "owner" || membership?.role === "admin";
  const publicTeamUrl = new URL(`/t/${currentTeam.slug}`, getAppUrl()).toString();
  const registrationUrl = new URL(
    `/t/${currentTeam.slug}/cadastro`,
    getAppUrl(),
  ).toString();
  const whatsappRegistrationUrl = `https://wa.me/?text=${encodeURIComponent(
    `Faça seu cadastro no ${currentTeam.name}: ${registrationUrl}`,
  )}`;
  const activationSteps = [
    { label: "Time criado", complete: true },
    { label: "Primeiro atleta aprovado", complete: (athleteCount ?? 0) > 0 },
    { label: "Primeiro jogo agendado", complete: Boolean(nextEvent) },
  ];
  const completedSteps = activationSteps.filter((step) => step.complete).length;

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
        {query.created === "1" && (
          <section className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <BadgeCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Time criado com sucesso</p>
              <p className="mt-1 text-sm text-emerald-800">
                Compartilhe o cadastro para começar a formar o elenco.
              </p>
            </div>
          </section>
        )}

        <section className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Painel do time
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              O que vem agora
            </h1>
          </div>
          <Link
            href={`/app/${currentTeam.slug}/events/new`}
            className="grid size-11 place-items-center rounded-full bg-emerald-700 text-white shadow-sm"
            aria-label="Criar novo evento"
          >
            <Plus aria-hidden />
          </Link>
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
                <Link href={`/app/${currentTeam.slug}/events/${nextEvent.id}`} className="mt-5 inline-flex min-h-10 items-center text-sm font-semibold text-emerald-200 hover:text-white">
                  Abrir chamada
                </Link>
              </>
            ) : (
              <>
                <h2 className="mt-8 text-xl font-semibold">Agenda livre</h2>
                <p className="mt-2 text-sm text-emerald-100">
                  Crie um jogo avulso ou programe as próximas semanas.
                </p>
                <Link href={`/app/${currentTeam.slug}/events/new`} className="mt-5 inline-flex min-h-10 items-center text-sm font-semibold text-emerald-200 hover:text-white">
                  Criar primeiro evento
                </Link>
              </>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <UsersRound className="size-6 text-emerald-700" aria-hidden />
            <p className="mt-8 text-4xl font-bold tracking-tight">{athleteCount ?? 0}</p>
            <p className="mt-1 text-sm text-slate-600">atletas ativos no BID do time</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Ativação do time
                </p>
                <h2 className="mt-1 text-lg font-bold">{completedSteps} de 3 passos</h2>
              </div>
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
                {Math.round((completedSteps / activationSteps.length) * 100)}%
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {activationSteps.map((step) => (
                <li key={step.label} className="flex items-center gap-3 text-sm">
                  {step.complete ? (
                    <CheckCircle2 className="size-5 text-emerald-700" aria-hidden />
                  ) : (
                    <Circle className="size-5 text-slate-300" aria-hidden />
                  )}
                  <span className={step.complete ? "font-medium text-slate-900" : "text-slate-600"}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
            <MessageCircle className="size-6 text-emerald-800" aria-hidden />
            <h2 className="mt-4 text-lg font-bold text-emerald-950">Forme o elenco pelo WhatsApp</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900/80">
              Envie o cadastro público. Cada atleta entra como pendente até a aprovação do time.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="h-11 rounded-xl border-emerald-300 bg-white">
                <a href={publicTeamUrl} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden /> Página
                </a>
              </Button>
              <Button asChild className="h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800">
                <a href={whatsappRegistrationUrl} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden /> Compartilhar
                </a>
              </Button>
            </div>
          </article>
        </section>

        {canManageInvitations && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <UserPlus className="size-5" aria-hidden />
                </div>
                <div>
                  <h2 className="font-bold">Convidar para administrar</h2>
                  <p className="text-xs text-slate-500">Acesso confirmado pelo e-mail</p>
                </div>
              </div>
              <div className="mt-5">
                <AdminInviteForm
                  teamId={currentTeam.id}
                  teamSlug={currentTeam.slug}
                  canInviteAdmin={membership?.role === "owner"}
                />
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">Convites pendentes</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {pendingInvitations?.length ?? 0}
                </span>
              </div>
              {pendingInvitations?.length ? (
                <ul className="mt-4 divide-y divide-slate-100">
                  {pendingInvitations.map((invitation) => (
                    <li key={invitation.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{invitation.email}</p>
                        <p className="text-xs text-slate-500">
                          {invitation.role === "admin" ? "Administrador" : "Organizador"} · expira em 7 dias
                        </p>
                      </div>
                      <form action={revokeTeamInvitation}>
                        <input type="hidden" name="invitationId" value={invitation.id} />
                        <input type="hidden" name="teamSlug" value={currentTeam.slug} />
                        <Button type="submit" size="sm" variant="ghost">Revogar</Button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Nenhum convite aguardando resposta.
                </p>
              )}
            </article>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Atalhos</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              [UsersRound, "Atletas", `/app/${currentTeam.slug}/athletes`],
              [Check, "Presenças", nextEvent ? `/app/${currentTeam.slug}/events/${nextEvent.id}` : `/app/${currentTeam.slug}/events`],
              [ClipboardList, "Escalar", nextEvent ? `/app/${currentTeam.slug}/events/${nextEvent.id}#lineup` : `/app/${currentTeam.slug}/events`],
            ].map(([Icon, label, href]) => {
              const ShortcutIcon = Icon as typeof UsersRound;
              return (
                <Link
                  key={label as string}
                  href={href as string}
                  className="rounded-2xl bg-slate-50 px-2 py-4 text-center text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
                >
                  <ShortcutIcon className="mx-auto mb-2 size-5" aria-hidden />
                  {label as string}
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <TeamBottomNav teamSlug={currentTeam.slug} active="home" nextEventId={nextEvent?.id} />
    </main>
  );
}
