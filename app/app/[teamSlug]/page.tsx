import { TeamAppHeader } from "@/components/team-app-header";
import { TeamBottomNav } from "@/components/team-bottom-nav";
import { AppContainer } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { getAppUrl } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  MessageCircle,
  Pencil,
  Plus,
  Sparkles,
  Trophy,
  UserPlus,
  UsersRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type ActivityKind =
  | "registration"
  | "approval"
  | "event"
  | "completed"
  | "cancelled";

type Activity = {
  key: string;
  kind: ActivityKind;
  title: string;
  description: string;
  at: string;
  href: string;
};

const activityStyles: Record<
  ActivityKind,
  { icon: typeof CalendarDays; iconClassName: string; lineClassName: string }
> = {
  registration: {
    icon: UserPlus,
    iconClassName: "bg-amber-100 text-amber-800",
    lineClassName: "bg-amber-200",
  },
  approval: {
    icon: CheckCircle2,
    iconClassName: "bg-emerald-100 text-emerald-800",
    lineClassName: "bg-emerald-200",
  },
  event: {
    icon: CalendarDays,
    iconClassName: "bg-sky-100 text-sky-800",
    lineClassName: "bg-sky-200",
  },
  completed: {
    icon: Trophy,
    iconClassName: "bg-violet-100 text-violet-800",
    lineClassName: "bg-violet-200",
  },
  cancelled: {
    icon: XCircle,
    iconClassName: "bg-slate-100 text-slate-600",
    lineClassName: "bg-slate-200",
  },
};

const formatLabels = {
  field: "Campo",
  society: "Society",
  futsal: "Futsal",
};

export default async function TeamDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireUser();
  const [{ teamSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data: currentTeam }, { data: teams }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, slug, timezone")
      .eq("slug", teamSlug)
      .maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);
  if (!currentTeam) notFound();

  const now = new Date();
  const nowIso = now.toISOString();
  const [
    { count: athleteCount },
    { count: pendingAthleteCount },
    { count: eventCount },
    { data: nextEvent },
    { data: membership },
    { data: recentAthletes, error: athletesError },
    { data: recentEvents, error: eventsError },
  ] = await Promise.all([
    supabase
      .from("athletes")
      .select("id", { count: "exact", head: true })
      .eq("team_id", currentTeam.id)
      .eq("status", "active"),
    supabase
      .from("athletes")
      .select("id", { count: "exact", head: true })
      .eq("team_id", currentTeam.id)
      .eq("status", "pending"),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("team_id", currentTeam.id),
    supabase
      .from("events")
      .select("id, title, starts_at, sport_format")
      .eq("team_id", currentTeam.id)
      .eq("status", "scheduled")
      .gte("starts_at", nowIso)
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
      .from("athletes")
      .select(
        "id, full_name, preferred_name, status, created_at, updated_at, approved_at",
      )
      .eq("team_id", currentTeam.id)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("events")
      .select("id, title, status, starts_at, created_at, updated_at")
      .eq("team_id", currentTeam.id)
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);
  if (!membership) redirect("/me");
  if (athletesError || eventsError) {
    throw new Error("Não foi possível carregar as novidades do time.");
  }

  const attendanceByStatus = nextEvent
    ? await supabase
        .from("event_attendance")
        .select("status")
        .eq("event_id", nextEvent.id)
    : { data: [], error: null };
  if (attendanceByStatus.error) {
    throw new Error("Não foi possível carregar a chamada do próximo jogo.");
  }
  const nextEventConfirmed = (attendanceByStatus.data ?? []).filter(
    (item) => item.status === "confirmed",
  ).length;
  const nextEventPending = (attendanceByStatus.data ?? []).filter(
    (item) => item.status === "pending",
  ).length;

  const publicTeamUrl = new URL(`/t/${currentTeam.slug}`, getAppUrl()).toString();
  const registrationUrl = new URL(
    `/t/${currentTeam.slug}/cadastro`,
    getAppUrl(),
  ).toString();
  const whatsappRegistrationUrl = `https://wa.me/?text=${encodeURIComponent(
    `⚽ Vem jogar com o ${currentTeam.name}! Entre com seu WhatsApp ou crie seu perfil: ${registrationUrl}`,
  )}`;

  const activationSteps = [
    {
      label: "Time criado",
      description: "A casa do time está pronta",
      complete: true,
      href: `/app/${currentTeam.slug}`,
    },
    {
      label: "Primeiro atleta no BID",
      description: "Compartilhe o cadastro pelo WhatsApp",
      complete: (recentAthletes?.length ?? 0) > 0,
      href: whatsappRegistrationUrl,
      external: true,
    },
    {
      label: "Primeiro jogo marcado",
      description: "Defina data, horário e local",
      complete: (eventCount ?? 0) > 0,
      href: `/app/${currentTeam.slug}/events/new`,
    },
  ];
  const completedSteps = activationSteps.filter((step) => step.complete).length;
  const activationComplete = completedSteps === activationSteps.length;
  const nextActivationStep = activationSteps.find((step) => !step.complete);
  const activity = buildActivity({
    athletes: recentAthletes ?? [],
    events: recentEvents ?? [],
    teamSlug: currentTeam.slug,
  }).slice(0, 8);
  const canEditTeam = membership.role === "owner" || membership.role === "admin";

  return (
    <main className="app-canvas min-h-screen pb-24">
      <TeamAppHeader
        currentName={currentTeam.name}
        currentSlug={currentTeam.slug}
        teams={teams ?? []}
      />

      <AppContainer className="space-y-5 pb-8 sm:space-y-7">
        {query.created === "1" ? (
          <section className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <BadgeCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-bold">Seu time entrou em campo</p>
              <p className="mt-1 text-sm text-emerald-800">
                Complete a missão de estreia para deixar tudo pronto para o racha.
              </p>
            </div>
          </section>
        ) : null}

        <section className="flex items-end justify-between gap-4 pt-1 sm:pt-2">
          <div className="min-w-0">
            <p className="app-kicker">Central do time</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl">
              Bora pro jogo?
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              O que importa agora no {currentTeam.name}.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canEditTeam ? (
              <Button asChild variant="outline" size="icon" className="size-11 rounded-xl" title="Editar time">
                <Link href={`/app/${currentTeam.slug}/settings`} aria-label="Editar time">
                  <Pencil aria-hidden />
                </Link>
              </Button>
            ) : null}
            <Button asChild className="h-11 rounded-xl bg-emerald-700 px-4 hover:bg-emerald-800">
              <Link href={`/app/${currentTeam.slug}/events/new`}>
                <Plus aria-hidden /> <span className="hidden sm:inline">Novo jogo</span><span className="sm:hidden">Jogo</span>
              </Link>
            </Button>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-float">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-emerald-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 size-52 rounded-full bg-sky-500/10 blur-3xl" />
          {nextEvent ? (
            <div className="relative p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
                  Próximo jogo
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {formatLabels[nextEvent.sport_format]}
                </span>
              </div>

              <div className="mt-6 flex items-start gap-4 sm:mt-8">
                <div className="grid size-16 shrink-0 place-items-center rounded-[1.25rem] bg-white text-slate-950 shadow-lg sm:size-20">
                  <div className="text-center leading-none">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-700 sm:text-xs">
                      {new Intl.DateTimeFormat("pt-BR", {
                        month: "short",
                        timeZone: currentTeam.timezone,
                      })
                        .format(new Date(nextEvent.starts_at))
                        .replace(".", "")}
                    </span>
                    <span className="mt-1 block text-2xl font-black sm:text-3xl">
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        timeZone: currentTeam.timezone,
                      }).format(new Date(nextEvent.starts_at))}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-2xl font-black tracking-[-0.035em] sm:text-3xl">
                    {nextEvent.title}
                  </h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                    <Clock3 className="size-4 text-emerald-300" aria-hidden />
                    {new Intl.DateTimeFormat("pt-BR", {
                      weekday: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: currentTeam.timezone,
                    }).format(new Date(nextEvent.starts_at))}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.07] p-2">
                <div className="rounded-xl bg-white/[0.06] px-3 py-3">
                  <p className="text-2xl font-black text-white">{nextEventConfirmed}</p>
                  <p className="mt-0.5 text-xs text-slate-300">confirmados</p>
                </div>
                <div className="rounded-xl px-3 py-3">
                  <p className="text-2xl font-black text-white">{nextEventPending}</p>
                  <p className="mt-0.5 text-xs text-slate-300">ainda não responderam</p>
                </div>
              </div>

              <Button asChild size="lg" className="mt-4 h-12 w-full rounded-xl bg-white font-bold text-slate-950 hover:bg-emerald-50">
                <Link href={`/app/${currentTeam.slug}/events/${nextEvent.id}`}>
                  Abrir chamada <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="relative p-6 sm:p-8">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-emerald-300">
                <CalendarDays className="size-6" aria-hidden />
              </span>
              <p className="mt-8 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">
                Agenda livre
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                Qual é o próximo jogo?
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
                Marque o racha e a chamada já fica pronta para o elenco responder.
              </p>
              <Button asChild size="lg" className="mt-6 h-12 rounded-xl bg-white text-slate-950 hover:bg-emerald-50">
                <Link href={`/app/${currentTeam.slug}/events/new`}>
                  <Plus aria-hidden /> Marcar primeiro jogo
                </Link>
              </Button>
            </div>
          )}
        </section>

        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          <DashboardMetric value={athleteCount ?? 0} label="no elenco" icon={UsersRound} />
          <DashboardMetric value={pendingAthleteCount ?? 0} label="para aprovar" icon={UserPlus} highlight={(pendingAthleteCount ?? 0) > 0} />
          <DashboardMetric value={eventCount ?? 0} label="jogos criados" icon={CalendarDays} />
        </section>

        {!activationComplete && nextActivationStep ? (
          <section className="relative overflow-hidden rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-soft sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-amber-300/25 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-400 text-amber-950 shadow-sm">
                <Trophy className="size-6" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.13em] text-amber-800">
                      Missão de estreia
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-amber-950">
                      Nível {completedSteps} de {activationSteps.length}
                    </h2>
                  </div>
                  <span className="text-sm font-black text-amber-900">
                    {Math.round((completedSteps / activationSteps.length) * 100)}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-200">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-[width]"
                    style={{ width: `${(completedSteps / activationSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
              {activationSteps.map((step) => (
                <div
                  key={step.label}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm ${
                    step.complete
                      ? "bg-white/55 text-amber-950"
                      : step === nextActivationStep
                        ? "bg-white font-bold text-slate-950 shadow-sm"
                        : "text-amber-900/65"
                  }`}
                >
                  {step.complete ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-700" aria-hidden />
                  ) : (
                    <Circle className="size-5 shrink-0 text-amber-400" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p>{step.label}</p>
                    {!step.complete ? (
                      <p className="mt-0.5 text-xs font-normal text-slate-500">
                        {step.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <Button asChild className="relative mt-4 h-12 w-full rounded-xl bg-amber-950 text-amber-50 hover:bg-slate-950">
              {nextActivationStep.external ? (
                <a href={nextActivationStep.href} target="_blank" rel="noreferrer">
                  Completar próxima missão <ArrowRight aria-hidden />
                </a>
              ) : (
                <Link href={nextActivationStep.href}>
                  Completar próxima missão <ArrowRight aria-hidden />
                </Link>
              )}
            </Button>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[1.75rem] border border-emerald-200/80 bg-emerald-950 text-white shadow-soft">
          <div className="p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-400 text-emerald-950">
                <MessageCircle className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  WhatsApp-first
                </p>
                <h2 className="mt-1 text-lg font-black">Chame a galera para o time</h2>
                <p className="mt-1 text-sm leading-6 text-emerald-100/80">
                  Um link para entrar, criar o perfil e pedir aprovação no BID.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-[1fr_auto] gap-2 sm:mt-0 sm:min-w-72">
              <Button asChild className="h-12 rounded-xl bg-emerald-400 font-bold text-emerald-950 hover:bg-emerald-300">
                <a href={whatsappRegistrationUrl} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden /> Compartilhar
                </a>
              </Button>
              <Button asChild variant="outline" size="icon" className="size-12 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <a href={publicTeamUrl} target="_blank" rel="noreferrer" aria-label="Abrir página pública">
                  <ChevronRight aria-hidden />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="app-surface overflow-hidden p-0">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
            <div>
              <div className="flex items-center gap-2 text-emerald-700">
                <Sparkles className="size-4" aria-hidden />
                <p className="text-xs font-black uppercase tracking-[0.13em]">
                  Aconteceu no time
                </p>
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">
                Linha do tempo
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              últimos movimentos
            </span>
          </div>

          {activity.length ? (
            <ol className="px-5 py-2 sm:px-6">
              {activity.map((item, index) => {
                const style = activityStyles[item.kind];
                const Icon = style.icon;
                return (
                  <li key={item.key} className="relative flex gap-4 py-4">
                    {index < activity.length - 1 ? (
                      <span
                        className={`absolute left-[1.1875rem] top-12 h-[calc(100%-2rem)] w-px ${style.lineClassName}`}
                        aria-hidden
                      />
                    ) : null}
                    <span className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-2xl ${style.iconClassName}`}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <Link href={item.href} className="group min-w-0 flex-1 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {item.description}
                          </p>
                        </div>
                        <time
                          dateTime={item.at}
                          title={new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone: currentTeam.timezone,
                          }).format(new Date(item.at))}
                          className="shrink-0 text-[11px] font-medium text-slate-400"
                        >
                          {relativeTime(item.at, now)}
                        </time>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="p-8 text-center sm:p-10">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-bold text-slate-900">A história começa agora</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Novos atletas e jogos vão aparecer aqui.
              </p>
            </div>
          )}
        </section>
      </AppContainer>

      <TeamBottomNav
        teamSlug={currentTeam.slug}
        active="home"
        nextEventId={nextEvent?.id}
      />
    </main>
  );
}

function DashboardMetric({
  value,
  label,
  icon: Icon,
  highlight = false,
}: {
  value: number;
  label: string;
  icon: typeof UsersRound;
  highlight?: boolean;
}) {
  return (
    <article
      className={`min-w-0 rounded-2xl border p-3.5 shadow-soft sm:p-4 ${
        highlight
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200/80 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon className={`size-4 ${highlight ? "text-amber-700" : "text-emerald-700"}`} aria-hidden />
        {highlight ? <span className="size-2 rounded-full bg-amber-500" aria-label="Requer atenção" /> : null}
      </div>
      <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 sm:text-xs">
        {label}
      </p>
    </article>
  );
}

function buildActivity({
  athletes,
  events,
  teamSlug,
}: {
  athletes: Array<{
    id: string;
    full_name: string;
    preferred_name: string | null;
    status: "pending" | "active" | "inactive" | "rejected";
    created_at: string;
    updated_at: string;
    approved_at: string | null;
  }>;
  events: Array<{
    id: string;
    title: string;
    status: "scheduled" | "cancelled" | "completed";
    starts_at: string;
    created_at: string;
    updated_at: string;
  }>;
  teamSlug: string;
}) {
  const athleteActivity: Activity[] = athletes.map((athlete) => {
    const name = athlete.preferred_name || athlete.full_name;
    if (athlete.status === "active") {
      return {
        key: `athlete-approved-${athlete.id}`,
        kind: "approval",
        title: `${name} entrou no elenco`,
        description: "Cadastro aprovado no BID do time.",
        at: athlete.approved_at ?? athlete.updated_at,
        href: `/app/${teamSlug}/athletes`,
      };
    }
    if (athlete.status === "pending") {
      return {
        key: `athlete-pending-${athlete.id}`,
        kind: "registration",
        title: `${name} pediu para entrar`,
        description: "Novo cadastro aguardando sua aprovação.",
        at: athlete.created_at,
        href: `/app/${teamSlug}/athletes`,
      };
    }
    return {
      key: `athlete-updated-${athlete.id}`,
      kind: "registration",
      title: `Cadastro de ${name} atualizado`,
      description:
        athlete.status === "rejected"
          ? "A solicitação não foi aprovada."
          : "O vínculo com o time ficou inativo.",
      at: athlete.updated_at,
      href: `/app/${teamSlug}/athletes`,
    };
  });

  const eventActivity: Activity[] = events.map((event) => {
    const wasUpdated =
      new Date(event.updated_at).getTime() - new Date(event.created_at).getTime() >
      2_000;
    if (event.status === "completed") {
      return {
        key: `event-completed-${event.id}`,
        kind: "completed",
        title: `${event.title} foi encerrado`,
        description: "Súmula e estatísticas da partida estão disponíveis.",
        at: event.updated_at,
        href: `/app/${teamSlug}/events/${event.id}/match`,
      };
    }
    if (event.status === "cancelled") {
      return {
        key: `event-cancelled-${event.id}`,
        kind: "cancelled",
        title: `${event.title} foi cancelado`,
        description: "O evento não aparece mais na agenda ativa.",
        at: event.updated_at,
        href: `/app/${teamSlug}/events/${event.id}`,
      };
    }
    return {
      key: `event-${event.id}`,
      kind: "event",
      title: wasUpdated ? `${event.title} foi atualizado` : `Novo jogo: ${event.title}`,
      description: wasUpdated
        ? "Data, horário ou informações do evento mudaram."
        : "A chamada já está disponível para o elenco.",
      at: wasUpdated ? event.updated_at : event.created_at,
      href: `/app/${teamSlug}/events/${event.id}`,
    };
  });

  return [...athleteActivity, ...eventActivity].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

function relativeTime(value: string, now: Date) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(value).getTime()) / 1_000),
  );
  if (elapsedSeconds < 60) return "agora";
  if (elapsedSeconds < 3_600) return `há ${Math.floor(elapsedSeconds / 60)} min`;
  if (elapsedSeconds < 86_400) return `há ${Math.floor(elapsedSeconds / 3_600)} h`;
  if (elapsedSeconds < 604_800) return `há ${Math.floor(elapsedSeconds / 86_400)} d`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(value))
    .replace(".", "");
}
