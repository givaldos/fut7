import { LiveMatchRefresh } from "@/components/live-match-refresh";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  BadgeCheck,
  Goal,
  Radio,
  ShieldAlert,
  Square,
  Trophy,
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

export default async function PlayerMatchPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireUser();
  const { eventId } = await params;
  const supabase = await createClient();
  const [{ data: event }, { data: links, error: linksError }] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "id, team_id, title, kind, sport_format, starts_at, ends_at, status",
        )
        .eq("id", eventId)
        .maybeSingle(),
      supabase.rpc("list_my_player_team_links"),
    ]);

  if (linksError) throw new Error("Não foi possível validar seu vínculo.");
  const teamLink = links?.find(
    (link) =>
      link.team_id === event?.team_id && link.athlete_status === "active",
  );
  if (!event || !teamLink || event.status === "cancelled") notFound();

  const [{ data: report }, { data: incidents }, { data: squads }] =
    await Promise.all([
      supabase
        .from("match_reports")
        .select(
          "side_a_label, side_b_label, side_a_score, side_b_score, notes, finalized_at",
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
        .from("event_squads")
        .select("name, sort_order")
        .eq("event_id", event.id)
        .order("sort_order")
        .limit(2),
    ]);

  const athleteIds = Array.from(
    new Set(
      (incidents ?? []).flatMap((incident) =>
        incident.assist_athlete_id
          ? [incident.athlete_id, incident.assist_athlete_id]
          : [incident.athlete_id],
      ),
    ),
  );
  const { data: athletes } = athleteIds.length
    ? await supabase
        .from("athletes")
        .select("id, full_name, preferred_name")
        .eq("team_id", event.team_id)
        .in("id", athleteIds)
    : { data: [] };
  const athleteById = new Map(
    (athletes ?? []).map((athlete) => [
      athlete.id,
      athlete.preferred_name || athlete.full_name,
    ]),
  );
  const sideALabel = report?.side_a_label ?? squads?.[0]?.name ?? "Time A";
  const sideBLabel = report?.side_b_label ?? squads?.[1]?.name ?? "Time B";
  const finalized = Boolean(report?.finalized_at);
  const started =
    new Date(event.starts_at).valueOf() <= new Date().valueOf();
  const live = started && !finalized && event.status === "scheduled";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-10">
      <LiveMatchRefresh active={live} />
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/me/agenda"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"
        >
          <ArrowLeft className="size-4" aria-hidden /> Voltar à agenda
        </Link>
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            <Radio className="size-4 animate-pulse" aria-hidden /> Ao vivo
          </span>
        ) : finalized ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <BadgeCheck className="size-4" aria-hidden /> Encerrada
          </span>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
        <div className="p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            {teamLink.team_name} · {kindLabels[event.kind]}
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            {event.title}
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: teamLink.team_timezone,
            }).format(new Date(event.starts_at))}
          </p>
          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
            <div>
              <p className="truncate text-sm font-semibold text-slate-300">
                {sideALabel}
              </p>
              <p className="mt-1 text-5xl font-black">
                {report?.side_a_score ?? 0}
              </p>
            </div>
            <span className="text-xl font-black text-slate-600">×</span>
            <div>
              <p className="truncate text-sm font-semibold text-slate-300">
                {sideBLabel}
              </p>
              <p className="mt-1 text-5xl font-black">
                {report?.side_b_score ?? 0}
              </p>
            </div>
          </div>
          {live && (
            <p className="mt-6 text-center text-[10px] text-slate-400">
              Atualização automática a cada 15 segundos
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Partida
            </p>
            <h2 className="mt-1 text-xl font-bold">Lances</h2>
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
              const IncidentIcon =
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
                    <IncidentIcon className="size-5" aria-hidden />
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
                      <p className="mt-1 text-xs text-slate-400">
                        {incident.notes}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Trophy className="mx-auto size-8 text-slate-400" aria-hidden />
            <p className="mt-3 font-semibold">
              {started ? "Nenhum lance registrado" : "A partida ainda não começou"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              O placar e a cronologia aparecerão aqui conforme forem lançados.
            </p>
          </div>
        )}
      </section>

      {report?.notes && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Resumo da partida</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {report.notes}
          </p>
        </section>
      )}
    </div>
  );
}
