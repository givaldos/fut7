import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

const statusLabels = {
  pending: "Aguardando aprovação",
  active: "Aprovado",
  inactive: "Inativo",
  rejected: "Não aprovado",
};

export default async function PlayerPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const [
    { data: profile },
    { data: preferences },
    { data: links, error: linksError },
  ] = await Promise.all([
    supabase
      .from("player_profiles")
      .select(
        "handle, display_name, preferred_name, bio, is_public, phone_verified_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("player_position_preferences")
      .select("position_code")
      .eq("user_id", user.id),
    supabase.rpc("list_my_player_team_links"),
  ]);
  if (linksError) throw new Error("Não foi possível carregar seus times.");

  const activeLinks = (links ?? []).filter(
    (link) => link.athlete_status === "active",
  );
  const activeTeamIds = activeLinks.map((link) => link.team_id);
  const { data: events, error: eventsError } = activeTeamIds.length
    ? await supabase
        .from("events")
        .select("id, team_id, title, starts_at, status")
        .in("team_id", activeTeamIds)
        .eq("status", "scheduled")
        .gt("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(20)
    : { data: [], error: null };
  if (eventsError) {
    throw new Error("Não foi possível carregar seus próximos jogos.");
  }

  const eventIds = (events ?? []).map((event) => event.id);
  const { data: attendance, error: attendanceError } = eventIds.length
    ? await supabase
        .from("event_attendance")
        .select("event_id, athlete_id, status")
        .in("event_id", eventIds)
        .in(
          "athlete_id",
          activeLinks.map((link) => link.athlete_id),
        )
    : { data: [], error: null };
  if (attendanceError) {
    throw new Error("Não foi possível carregar suas confirmações.");
  }

  const linkByTeam = new Map(
    activeLinks.map((link) => [link.team_id, link]),
  );
  const responseByEvent = new Map(
    (attendance ?? []).map((item) => [item.event_id, item]),
  );
  const pendingEvents = (events ?? []).filter(
    (event) => (responseByEvent.get(event.id)?.status ?? "pending") === "pending",
  );
  const nextActionEvent = pendingEvents[0] ?? events?.[0];
  const nextActionTeam = nextActionEvent
    ? linkByTeam.get(nextActionEvent.team_id)
    : undefined;
  const profileSteps = [
    Boolean(profile),
    Boolean(profile?.bio?.trim()),
    Boolean(preferences?.length),
    Boolean(links?.length),
  ];
  const profileProgress = profileSteps.filter(Boolean).length * 25;
  const query = await searchParams;
  const firstName =
    profile?.preferred_name ||
    profile?.display_name?.split(" ")[0] ||
    "atleta";
  const summaries: {
    value: number;
    label: string;
    icon: typeof CalendarDays;
    color: string;
  }[] = [
    {
      value: events?.length ?? 0,
      label: "Próximos",
      icon: CalendarDays,
      color: "text-emerald-700",
    },
    {
      value: pendingEvents.length,
      label: "Para responder",
      icon: Clock3,
      color: "text-amber-700",
    },
    {
      value: activeLinks.length,
      label: "Times ativos",
      icon: UsersRound,
      color: "text-sky-700",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
      {query.registered === "1" && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <BadgeCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <strong className="block">Cadastro concluído.</strong>
            Seu vínculo aparecerá como aprovado assim que o administrador do
            time fizer a revisão.
          </span>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl bg-emerald-950 text-white shadow-sm">
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-end sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
              Seu futebol
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Olá, {firstName}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100">
              Veja o que precisa da sua atenção e acompanhe seus vínculos com
              os times.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {profile?.phone_verified_at && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-emerald-100">
                <BadgeCheck className="size-4" aria-hidden /> WhatsApp verificado
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-emerald-100">
              <ShieldCheck className="size-4" aria-hidden /> Dados protegidos
            </span>
          </div>
        </div>
      </section>

      <section aria-label="Resumo" className="grid grid-cols-3 gap-2 sm:gap-3">
        {summaries.map((summary) => {
          const SummaryIcon = summary.icon;
          return (
            <article
              key={summary.label}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
            >
              <SummaryIcon
                className={`size-4 ${summary.color}`}
                aria-hidden
              />
              <p className="mt-2 text-2xl font-black tracking-tight">
                {summary.value}
              </p>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-500 sm:text-xs">
                {summary.label}
              </p>
            </article>
          );
        })}
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Agora
            </p>
            <h2 className="mt-1 text-xl font-bold">Próxima ação</h2>
          </div>
          <Link
            href="/me/agenda"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-emerald-700"
          >
            Ver agenda <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {nextActionEvent ? (
          <article
            className={`mt-3 rounded-3xl border p-5 shadow-sm sm:p-6 ${
              pendingEvents.length
                ? "border-amber-200 bg-amber-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-white ${
                  pendingEvents.length ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {pendingEvents.length ? (
                  <Clock3 className="size-5" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-5" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {pendingEvents.length
                    ? `${pendingEvents.length} confirmação${pendingEvents.length === 1 ? "" : "ões"} pendente${pendingEvents.length === 1 ? "" : "s"}`
                    : "Tudo respondido"}
                </p>
                <h3 className="mt-1 truncate text-lg font-bold">
                  {nextActionEvent.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {nextActionTeam?.team_name} ·{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone:
                      nextActionTeam?.team_timezone ?? "America/Sao_Paulo",
                  }).format(new Date(nextActionEvent.starts_at))}
                </p>
                <Button
                  asChild
                  className="mt-4 h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800"
                >
                  <Link href="/me/agenda">
                    {pendingEvents.length
                      ? "Responder presença"
                      : "Consultar agenda"}
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </article>
        ) : (
          <div className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white p-7 text-center">
            <CalendarDays className="mx-auto size-8 text-slate-400" aria-hidden />
            <p className="mt-3 font-semibold">Nenhum jogo aberto para você</p>
            <p className="mt-1 text-sm text-slate-500">
              Os jogos aparecem quando um time aprova seu vínculo.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-violet-50 text-violet-700">
              <UserRound className="size-5" aria-hidden />
            </div>
            <span className="text-xs font-bold text-slate-500">
              {profileProgress}% completo
            </span>
          </div>
          <h2 className="mt-5 font-bold">Seu perfil de atleta</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Revise sua apresentação, posições e visibilidade sem misturar com a
            agenda.
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${profileProgress}%` }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link href="/me/perfil">Ver perfil</Link>
            </Button>
            {profile?.is_public && (
              <Button asChild variant="ghost" className="h-11 rounded-xl">
                <Link
                  href={`/p/${profile.handle}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Público <ExternalLink aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Vínculos
              </p>
              <h2 className="mt-1 font-bold">Meus times</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {links?.length ?? 0}
            </span>
          </div>
          {links?.length ? (
            <div className="mt-4 divide-y divide-slate-100">
              {links.slice(0, 3).map((link) => (
                <div
                  key={link.athlete_id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                    <UsersRound className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{link.team_name}</p>
                    <p className="text-xs text-slate-500">
                      BID FUT7 #{link.registration_number}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      link.athlete_status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : link.athlete_status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusLabels[link.athlete_status]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Você ainda não solicitou vínculo. Use a página pública enviada
              pelo seu time para entrar no BID.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
