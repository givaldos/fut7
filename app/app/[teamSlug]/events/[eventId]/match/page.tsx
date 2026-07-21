import { deleteMatchIncident } from "@/app/app/[teamSlug]/events/actions";
import {
  MatchIncidentForm,
  MatchScoreForm,
} from "@/components/admin-match-report";
import { Button } from "@/components/ui/button";
import { TeamAppHeader } from "@/components/team-app-header";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Goal,
  ListPlus,
  NotebookTabs,
  ShieldAlert,
  Square,
  Trash2,
  Trophy,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const kindLabels = {
  weekly_match: "Racha semanal",
  championship: "Campeonato",
  friendly: "Amistoso",
  tournament: "Torneio",
  training: "Treino",
  other: "Outro",
};

export default async function MatchReportPage({
  params,
}: {
  params: Promise<{ teamSlug: string; eventId: string }>;
}) {
  const user = await requireUser();
  const { teamSlug, eventId } = await params;
  const supabase = await createClient();
  const [{ data: team }, { data: teams }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, slug, timezone")
      .eq("slug", teamSlug)
      .maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);
  if (!team) notFound();

  const [{ data: membership }, { data: event }] = await Promise.all([
    supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, title, kind, sport_format, starts_at, status")
      .eq("id", eventId)
      .eq("team_id", team.id)
      .maybeSingle(),
  ]);
  if (
    !membership ||
    !event ||
    !["scheduled", "completed"].includes(event.status)
  ) {
    notFound();
  }

  const [
    { data: report },
    { data: incidents },
    { data: attendance },
    { data: squads },
  ] = await Promise.all([
    supabase
      .from("match_reports")
      .select(
        "id, side_a_label, side_b_label, side_a_score, side_b_score, notes, finalized_at, updated_at",
      )
      .eq("event_id", event.id)
      .maybeSingle(),
    supabase
      .from("match_incidents")
      .select(
        "id, kind, athlete_id, assist_athlete_id, scoring_side, minute, notes, created_at",
      )
      .eq("event_id", event.id)
      .order("minute", { ascending: true, nullsFirst: false })
      .order("created_at"),
    supabase
      .from("event_attendance")
      .select("athlete_id")
      .eq("event_id", event.id)
      .eq("status", "confirmed"),
    supabase
      .from("event_squads")
      .select("name, sort_order")
      .eq("event_id", event.id)
      .order("sort_order")
      .limit(2),
  ]);

  const confirmedAthleteIds = (attendance ?? []).map(
    (item) => item.athlete_id,
  );
  const { data: athletes } = confirmedAthleteIds.length
    ? await supabase
        .from("athletes")
        .select("id, full_name, preferred_name, shirt_number")
        .eq("team_id", team.id)
        .in("id", confirmedAthleteIds)
        .order("preferred_name", { nullsFirst: false })
        .order("full_name")
    : { data: [] };
  const athleteById = new Map(
    (athletes ?? []).map((athlete) => [
      athlete.id,
      athlete.preferred_name || athlete.full_name,
    ]),
  );
  const sideALabel = report?.side_a_label ?? squads?.[0]?.name ?? "Time A";
  const sideBLabel = report?.side_b_label ?? squads?.[1]?.name ?? "Time B";
  const sideAScore = report?.side_a_score ?? 0;
  const sideBScore = report?.side_b_score ?? 0;
  const goals = (incidents ?? []).filter((incident) => incident.kind === "goal");
  const yellowCards = (incidents ?? []).filter(
    (incident) => incident.kind === "yellow_card",
  ).length;
  const redCards = (incidents ?? []).filter(
    (incident) => incident.kind === "red_card",
  ).length;
  const eventStarted =
    new Date(event.starts_at).valueOf() <= new Date().valueOf();
  const finalized = Boolean(report?.finalized_at);

  return (
    <main className="min-h-svh bg-slate-50 pb-16 text-slate-950">
      <TeamAppHeader currentName={team.name} teams={teams ?? []} />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/app/${team.slug}/events/${event.id}`}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"
          >
            <ArrowLeft className="size-4" aria-hidden /> Voltar ao evento
          </Link>
          {finalized && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <BadgeCheck className="size-4" aria-hidden /> Encerrada
            </span>
          )}
        </div>

        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-300">
              <span>{kindLabels[event.kind]}</span>
              <span>·</span>
              <span>
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: team.timezone,
                }).format(new Date(event.starts_at))}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight">
              Súmula · {event.title}
            </h1>
            <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
              <div>
                <p className="truncate text-sm font-semibold text-slate-300">
                  {sideALabel}
                </p>
                <p className="mt-1 text-5xl font-black">{sideAScore}</p>
              </div>
              <span className="text-xl font-black text-slate-600">×</span>
              <div>
                <p className="truncate text-sm font-semibold text-slate-300">
                  {sideBLabel}
                </p>
                <p className="mt-1 text-5xl font-black">{sideBScore}</p>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-3 gap-2 text-center">
              {[
                [goals.length, "Gols"],
                [yellowCards, "Amarelos"],
                [redCards, "Vermelhos"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-white/5 p-3">
                  <p className="font-black">{value}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ListPlus className="size-5" aria-hidden />
              </div>
              <div>
                <h2 className="font-bold">Registrar lance</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Gol, assistência ou cartão para atleta confirmado.
                </p>
              </div>
            </div>
            {athletes?.length ? (
              <MatchIncidentForm
                key={(incidents ?? []).length}
                teamSlug={team.slug}
                eventId={event.id}
                sideALabel={sideALabel}
                sideBLabel={sideBLabel}
                athletes={(athletes ?? []).map((athlete) => ({
                  id: athlete.id,
                  name: athlete.preferred_name || athlete.full_name,
                  shirtNumber: athlete.shirt_number,
                }))}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                <UsersRound className="mx-auto size-7 text-slate-400" aria-hidden />
                <p className="mt-3 font-semibold">Nenhum atleta confirmado</p>
                <p className="mt-1 text-sm text-slate-500">
                  Confirme a presença na chamada antes de lançar estatísticas.
                </p>
              </div>
            )}
            {!eventStarted && !finalized && athletes?.length ? (
              <p className="mt-4 rounded-2xl bg-sky-50 p-4 text-xs leading-5 text-sky-800">
                A súmula já está aberta. Você pode preparar ou registrar lances
                sem esperar o horário marcado.
              </p>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
                <NotebookTabs className="size-5" aria-hidden />
              </div>
              <div>
                <h2 className="font-bold">Placar e resumo</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ajuste nomes, placar final e observações gerais.
                </p>
              </div>
            </div>
            <MatchScoreForm
              key={`${sideALabel}:${sideBLabel}:${sideAScore}:${sideBScore}:${report?.updated_at ?? "new"}`}
              teamSlug={team.slug}
              eventId={event.id}
              eventStarted={eventStarted}
              report={{
                sideALabel,
                sideBLabel,
                sideAScore,
                sideBScore,
                notes: report?.notes ?? "",
                finalized,
              }}
            />
          </section>
        </div>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Cronologia
              </p>
              <h2 className="mt-1 text-xl font-bold">Lances da partida</h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {incidents?.length ?? 0}
            </span>
          </div>

          {incidents?.length ? (
            <div className="mt-3 space-y-2">
              {incidents.map((incident) => {
                const athleteName =
                  athleteById.get(incident.athlete_id) ?? "Atleta";
                const assistName = incident.assist_athlete_id
                  ? athleteById.get(incident.assist_athlete_id)
                  : null;
                const Icon =
                  incident.kind === "goal"
                    ? Goal
                    : incident.kind === "yellow_card"
                      ? Square
                      : ShieldAlert;
                const iconColor =
                  incident.kind === "goal"
                    ? "bg-emerald-50 text-emerald-700"
                    : incident.kind === "yellow_card"
                      ? "bg-amber-50 text-amber-500"
                      : "bg-red-50 text-red-600";
                return (
                  <article
                    key={incident.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div
                      className={`grid size-10 shrink-0 place-items-center rounded-2xl ${iconColor}`}
                    >
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{athleteName}</h3>
                        {incident.minute && (
                          <span className="text-xs font-semibold text-slate-400">
                            {incident.minute}&apos;
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {incident.kind === "goal"
                          ? `Gol para ${incident.scoring_side === 1 ? sideALabel : sideBLabel}${assistName ? ` · assistência de ${assistName}` : ""}`
                          : incident.kind === "yellow_card"
                            ? "Cartão amarelo"
                            : "Cartão vermelho"}
                      </p>
                      {incident.notes && (
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {incident.notes}
                        </p>
                      )}
                    </div>
                    <form action={deleteMatchIncident}>
                      <input type="hidden" name="teamSlug" value={team.slug} />
                      <input type="hidden" name="eventId" value={event.id} />
                      <input
                        type="hidden"
                        name="incidentId"
                        value={incident.id}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        aria-label={`Excluir lance de ${athleteName}`}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </form>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Trophy className="mx-auto size-8 text-slate-400" aria-hidden />
              <p className="mt-3 font-semibold">Nenhum lance registrado</p>
              <p className="mt-1 text-sm text-slate-500">
                A cronologia será montada conforme os acontecimentos forem
                lançados.
              </p>
            </div>
          )}
        </section>

        <p className="flex items-start gap-2 rounded-2xl bg-white p-4 text-xs leading-5 text-slate-500">
          <CalendarDays
            className="mt-0.5 size-4 shrink-0 text-emerald-700"
            aria-hidden
          />
          Gols, assistências e cartões entram nas estatísticas dos atletas
          somente depois que a partida for encerrada.
        </p>
      </div>
    </main>
  );
}
