import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { PublicEventAttendance } from "@/components/public-event-attendance";
import {
  getPublicAthletes,
  getPublicTeam,
  getPublicUpcomingEvents,
} from "@/lib/data/public-team";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  LogIn,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const kindLabels = {
  weekly_match: "Racha semanal",
  championship: "Campeonato",
  friendly: "Amistoso",
  tournament: "Torneio",
  training: "Treino",
  other: "Outro evento",
};

const responseLabels = {
  pending: "Ainda não respondeu",
  confirmed: "Você vai",
  declined: "Você não vai",
  maybe: "Talvez você vá",
  waitlist: "Lista de espera",
};

export default async function PublicTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/.test(slug)) {
    notFound();
  }

  const [team, athletes, events] = await Promise.all([
    getPublicTeam(slug),
    getPublicAthletes(slug),
    getPublicUpcomingEvents(slug),
  ]);
  if (!team?.name) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;
  const { data: links, error: linksError } = userId
    ? await supabase.rpc("list_my_player_team_links")
    : { data: [], error: null };
  if (linksError) throw new Error("Não foi possível carregar seu vínculo com o time.");

  const teamLink = (links ?? []).find((link) => link.team_slug === slug);
  const eventIds = events.map((event) => event.event_id);
  const { data: attendance, error: attendanceError } =
    teamLink?.athlete_status === "active" && eventIds.length
      ? await supabase
          .from("event_attendance")
          .select("event_id, status")
          .eq("athlete_id", teamLink.athlete_id)
          .in("event_id", eventIds)
      : { data: [], error: null };
  if (attendanceError) throw new Error("Não foi possível carregar suas confirmações.");
  const responseByEvent = new Map((attendance ?? []).map((item) => [item.event_id, item.status]));

  return (
    <main className="app-canvas pb-12">
      <header className="relative overflow-hidden bg-slate-950 px-5 pb-16 pt-6 text-white">
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <BrandMark className="[&_span:last-child]:text-white" />
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
              <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">{team.name}</h1>
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
        <section id="agenda" className="app-surface scroll-mt-4 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Agenda do time</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Próximos jogos</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {events.length}
            </span>
          </div>

          {events.length ? (
            <div className="mt-5 space-y-4">
              {events.map((event) => {
                const response = responseByEvent.get(event.event_id) ?? "pending";
                const deadlineClosed = Boolean(
                  event.attendance_deadline && new Date(event.attendance_deadline) < new Date(),
                );
                const timeZone = event.team_timezone || "America/Sao_Paulo";
                return (
                  <article key={event.event_id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(7,35,24,0.4)] sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm">
                        <div className="text-center leading-none">
                          <span className="block text-[10px] font-bold uppercase text-emerald-300">
                            {new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone }).format(new Date(event.starts_at)).replace(".", "")}
                          </span>
                          <span className="mt-1 block text-lg font-black">
                            {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone }).format(new Date(event.starts_at))}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-emerald-700">
                          {kindLabels[event.kind]} · {event.sport_format === "field" ? "Campo" : event.sport_format === "futsal" ? "Futsal" : "Society"}
                        </p>
                        <h3 className="mt-1 truncate font-bold text-slate-950">{event.title}</h3>
                        {event.opponent_name ? <p className="mt-0.5 text-xs text-slate-500">vs. {event.opponent_name}</p> : null}
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                          <CalendarDays className="size-4" aria-hidden />
                          {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone }).format(new Date(event.starts_at))}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                          <Clock3 className="size-4" aria-hidden />
                          {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(event.starts_at))}
                        </p>
                      </div>
                    </div>

                    {teamLink?.athlete_status === "active" ? (
                      <>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                          <p className="text-xs font-semibold text-slate-600">{responseLabels[response]}</p>
                          {event.attendance_deadline ? (
                            <p className={`text-[11px] ${deadlineClosed ? "text-amber-700" : "text-slate-500"}`}>
                              {deadlineClosed ? "Prazo encerrado" : `Até ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone }).format(new Date(event.attendance_deadline))}`}
                            </p>
                          ) : null}
                        </div>
                        <PublicEventAttendance
                          teamSlug={slug}
                          eventId={event.event_id}
                          currentStatus={response}
                          deadlineClosed={deadlineClosed}
                        />
                      </>
                    ) : null}
                  </article>
                );
              })}

              {!userId ? (
                <div className="rounded-2xl bg-emerald-950 p-4 text-white">
                  <p className="font-semibold">Já é atleta do time?</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-100">Entre com seu WhatsApp para confirmar presença.</p>
                  <Button asChild className="mt-4 h-11 w-full rounded-xl bg-white text-emerald-950 hover:bg-emerald-50">
                    <Link href={`/auth/login?next=${encodeURIComponent(`/t/${slug}#agenda`)}`}>
                      <LogIn aria-hidden /> Entrar e confirmar
                    </Link>
                  </Button>
                </div>
              ) : teamLink?.athlete_status === "pending" ? (
                <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  Seu vínculo está aguardando aprovação do time. As confirmações serão liberadas assim que o administrador aprovar você.
                </p>
              ) : teamLink?.athlete_status !== "active" ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  Para confirmar presença, solicite seu vínculo com este time e aguarde a aprovação.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <CalendarDays className="mx-auto size-8 text-slate-400" aria-hidden />
              <p className="mt-3 font-semibold text-slate-800">Nenhum jogo agendado</p>
              <p className="mt-1 text-sm text-slate-500">Os próximos eventos aparecerão aqui.</p>
            </div>
          )}
        </section>

        <section className="app-surface p-5">
          {teamLink?.athlete_status === "active" ? (
            <>
              <div className="flex items-center gap-2 text-emerald-700"><ShieldCheck className="size-5" aria-hidden /><h2 className="text-lg font-semibold text-slate-950">Você faz parte deste time</h2></div>
              <p className="mt-2 text-sm leading-6 text-slate-600">Acompanhe todos os seus times, jogos e dados pessoais na área do atleta.</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-950">Quer jogar com a gente?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Envie seus dados. Um administrador confirma o vínculo antes de você aparecer no elenco.</p>
            </>
          )}
          <Button
            asChild
            size="lg"
            className="mt-5 h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
          >
            <Link href={teamLink?.athlete_status === "active" ? "/me" : `/t/${slug}/cadastro`}>
              {teamLink?.athlete_status === "active" ? "Abrir minha área" : "Entrar ou cadastrar"} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </section>

        <section className="app-surface p-5">
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
