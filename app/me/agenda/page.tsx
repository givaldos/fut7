import { respondToEventAsPlayer } from "@/app/me/actions";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleHelp,
  Clock3,
  ExternalLink,
  Radio,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";

const responseLabels = {
  pending: "Aguardando sua resposta",
  confirmed: "Presença confirmada",
  declined: "Você não vai",
  maybe: "Você talvez vá",
  waitlist: "Lista de espera",
};

const responseStyles = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-700",
  maybe: "bg-sky-50 text-sky-700",
  waitlist: "bg-slate-100 text-slate-600",
};

export default async function PlayerAgendaPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: links, error: linksError } = await supabase.rpc(
    "list_my_player_team_links",
  );
  if (linksError) throw new Error("Não foi possível carregar seus times.");

  const activeLinks = (links ?? []).filter(
    (link) => link.athlete_status === "active",
  );
  const activeTeamIds = activeLinks.map((link) => link.team_id);
  const { data: events, error: eventsError } = activeTeamIds.length
    ? await supabase
        .from("events")
        .select(
          "id, team_id, title, kind, sport_format, starts_at, attendance_deadline, status",
        )
        .in("team_id", activeTeamIds)
        .eq("status", "scheduled")
        .gt("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(50)
    : { data: [], error: null };
  if (eventsError) {
    throw new Error("Não foi possível carregar seus próximos jogos.");
  }

  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 30);
  const { data: recentEvents, error: recentEventsError } = activeTeamIds.length
    ? await supabase
        .from("events")
        .select("id, team_id, title, starts_at, status")
        .in("team_id", activeTeamIds)
        .in("status", ["scheduled", "completed"])
        .gte("starts_at", recentCutoff.toISOString())
        .lte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: false })
        .limit(20)
    : { data: [], error: null };
  if (recentEventsError) {
    throw new Error("Não foi possível carregar seus jogos recentes.");
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
  const pendingCount = (events ?? []).filter(
    (event) => (responseByEvent.get(event.id)?.status ?? "pending") === "pending",
  ).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-10">
      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Seus compromissos
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Agenda
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Confirme sua presença nos próximos eventos dos times aprovados.
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-xl font-black text-amber-700">{pendingCount}</p>
          <p className="text-[10px] font-semibold text-slate-500">pendentes</p>
        </div>
      </section>

      {events?.length ? (
        <section aria-label="Próximos eventos" className="space-y-3">
          {events.map((event) => {
            const link = linkByTeam.get(event.team_id);
            const response = responseByEvent.get(event.id);
            const currentStatus = response?.status ?? "pending";
            const deadlineClosed = Boolean(
              event.attendance_deadline &&
                new Date(event.attendance_deadline) < new Date(),
            );
            return (
              <article
                key={event.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="min-w-14 rounded-2xl bg-emerald-50 px-2 py-2 text-center text-emerald-800">
                      <p className="text-[10px] font-bold uppercase">
                        {new Intl.DateTimeFormat("pt-BR", {
                          month: "short",
                          timeZone:
                            link?.team_timezone ?? "America/Sao_Paulo",
                        })
                          .format(new Date(event.starts_at))
                          .replace(".", "")}
                      </p>
                      <p className="text-xl font-black">
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          timeZone:
                            link?.team_timezone ?? "America/Sao_Paulo",
                        }).format(new Date(event.starts_at))}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/t/${link?.team_slug}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          {link?.team_name}
                          <ExternalLink className="size-3" aria-hidden />
                        </Link>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${responseStyles[currentStatus]}`}
                        >
                          {responseLabels[currentStatus]}
                        </span>
                      </div>
                      <h2 className="mt-1 truncate text-lg font-bold">
                        {event.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Intl.DateTimeFormat("pt-BR", {
                          weekday: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone:
                            link?.team_timezone ?? "America/Sao_Paulo",
                        }).format(new Date(event.starts_at))}
                        {" · "}
                        {event.sport_format === "field"
                          ? "Campo"
                          : event.sport_format === "futsal"
                            ? "Futsal"
                            : "Society"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {(
                      [
                        [
                          "confirmed",
                          "Vou",
                          Check,
                          "data-[active=true]:border-emerald-600 data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-800",
                        ],
                        [
                          "maybe",
                          "Talvez",
                          CircleHelp,
                          "data-[active=true]:border-sky-500 data-[active=true]:bg-sky-50 data-[active=true]:text-sky-800",
                        ],
                        [
                          "declined",
                          "Não vou",
                          X,
                          "data-[active=true]:border-red-500 data-[active=true]:bg-red-50 data-[active=true]:text-red-700",
                        ],
                      ] as const
                    ).map(([status, label, Icon, activeClass]) => (
                      <form key={status} action={respondToEventAsPlayer}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="status" value={status} />
                        <button
                          type="submit"
                          disabled={deadlineClosed}
                          data-active={currentStatus === status}
                          aria-label={`${label} — ${event.title}`}
                          className={`flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 ${activeClass}`}
                        >
                          <Icon className="size-4" aria-hidden />
                          {label}
                        </button>
                      </form>
                    ))}
                  </div>

                  {deadlineClosed && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-amber-700">
                      <Clock3 className="size-4" aria-hidden /> Prazo de
                      confirmação encerrado.
                    </p>
                  )}
                  <Link
                    href={`/me/agenda/${event.id}`}
                    className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-emerald-700"
                  >
                    Acompanhar partida <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <CalendarDays className="mx-auto size-9 text-slate-400" aria-hidden />
          <h2 className="mt-3 font-bold">Sua agenda está livre</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Novos eventos aparecerão aqui quando forem publicados pelos times
            em que seu vínculo está aprovado.
          </p>
        </section>
      )}

      {recentEvents?.length ? (
        <section aria-label="Jogos recentes">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Últimos 30 dias
            </p>
            <h2 className="mt-1 text-xl font-bold">Jogos recentes</h2>
          </div>
          <div className="mt-3 space-y-3">
            {recentEvents.map((event) => {
              const link = linkByTeam.get(event.team_id);
              const live = event.status === "scheduled";
              return (
                <Link
                  key={event.id}
                  href={`/me/agenda/${event.id}`}
                  className="flex min-h-20 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300"
                >
                  <div
                    className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                      live
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {live ? (
                      <Radio className="size-5" aria-hidden />
                    ) : (
                      <Trophy className="size-5" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{event.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {link?.team_name} ·{" "}
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone:
                          link?.team_timezone ?? "America/Sao_Paulo",
                      }).format(new Date(event.starts_at))}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      live ? "text-red-700" : "text-slate-500"
                    }`}
                  >
                    {live ? "Ao vivo" : "Encerrado"}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
