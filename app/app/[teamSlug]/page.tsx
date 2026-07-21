import { revokeTeamInvitation } from "@/app/app/team-actions";
import { AdminInviteForm } from "@/components/admin-invite-form";
import { TeamAppHeader } from "@/components/team-app-header";
import { TeamBottomNav } from "@/components/team-bottom-nav";
import { AppContainer, PageHeader } from "@/components/ui/app-shell";
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
  NotebookTabs,
  ExternalLink,
  MessageCircle,
  Plus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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
  if (!membership) redirect("/me");

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
    <main className="app-canvas pb-24">
      <TeamAppHeader
        currentName={currentTeam.name}
        currentSlug={currentTeam.slug}
        teams={teams ?? []}
      />

      <AppContainer>
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

        <PageHeader
          eyebrow="Painel do time"
          title="Visão geral"
          description="Próximo jogo, elenco e ações importantes sem ruído."
          action={
            <Button asChild>
              <Link href={`/app/${currentTeam.slug}/events/new`}>
                <Plus aria-hidden /> <span className="hidden sm:inline">Novo evento</span><span className="sm:hidden">Novo</span>
              </Link>
            </Button>
          }
        />

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-float sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="flex items-center justify-between">
              <CalendarDays className="size-6 text-emerald-300" aria-hidden />
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-emerald-100">
                Próximo evento
              </span>
            </div>
            {nextEvent ? (
              <>
                <h2 className="mt-8 text-2xl font-black tracking-tight">{nextEvent.title}</h2>
                <p className="mt-2 text-sm text-emerald-100">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "full",
                    timeStyle: "short",
                    timeZone: currentTeam.timezone,
                  }).format(new Date(nextEvent.starts_at))}
                </p>
                <Link href={`/app/${currentTeam.slug}/events/${nextEvent.id}`} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-50">
                  Abrir chamada <CalendarDays className="size-4" aria-hidden />
                </Link>
              </>
            ) : (
              <>
                <h2 className="mt-8 text-2xl font-black tracking-tight">Agenda livre</h2>
                <p className="mt-2 text-sm text-emerald-100">
                  Crie um jogo avulso ou programe as próximas semanas.
                </p>
                <Link href={`/app/${currentTeam.slug}/events/new`} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-bold text-slate-950">
                  Criar primeiro evento
                </Link>
              </>
            )}
          </article>

          <article className="app-surface p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><UsersRound className="size-5" aria-hidden /></span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">BID ativo</span>
            </div>
            <p className="mt-7 text-5xl font-black tracking-[-0.05em]">{athleteCount ?? 0}</p>
            <p className="mt-1 text-sm font-medium text-slate-600">atletas disponíveis no elenco</p>
            <Link href={`/app/${currentTeam.slug}/athletes`} className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-emerald-700">Gerenciar atletas</Link>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <article className="app-surface p-5 sm:p-6">
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

          <article className="rounded-[1.5rem] border border-emerald-200/80 bg-emerald-50 p-5 shadow-soft sm:p-6">
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
            <article className="app-surface p-5 sm:p-6">
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

            <article className="app-surface p-5 sm:p-6">
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

        <section className="app-surface p-5">
          <p className="app-kicker">Acesso rápido</p>
          <h2 className="mt-1 text-lg font-black tracking-tight">Atalhos</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              [UsersRound, "Atletas", `/app/${currentTeam.slug}/athletes`],
              [Check, "Presenças", nextEvent ? `/app/${currentTeam.slug}/events/${nextEvent.id}` : `/app/${currentTeam.slug}/events`],
              [NotebookTabs, "Súmula", nextEvent ? `/app/${currentTeam.slug}/events/${nextEvent.id}/match` : `/app/${currentTeam.slug}/events`],
            ].map(([Icon, label, href]) => {
              const ShortcutIcon = Icon as typeof UsersRound;
              return (
                <Link
                  key={label as string}
                  href={href as string}
                  className="rounded-2xl bg-slate-50 px-2 py-4 text-center text-xs font-bold text-slate-700 transition active:scale-95 hover:bg-emerald-50 hover:text-emerald-900"
                >
                  <ShortcutIcon className="mx-auto mb-2 size-5" aria-hidden />
                  {label as string}
                </Link>
              );
            })}
          </div>
        </section>
      </AppContainer>

      <TeamBottomNav teamSlug={currentTeam.slug} active="home" nextEventId={nextEvent?.id} />
    </main>
  );
}
