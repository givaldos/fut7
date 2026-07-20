import {
  AdminEventForm,
  type EditableEventValues,
} from "@/components/admin-event-form";
import { TeamAppHeader } from "@/components/team-app-header";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, CalendarClock, ListChecks } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

function toLocalDateTime(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export default async function EditEventPage({
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
      .select("id, name, slug, timezone, default_sport_format")
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
      .select(
        "id, series_id, title, kind, organization_mode, sport_format, starts_at, ends_at, attendance_deadline, status, opponent_name, venue_id",
      )
      .eq("id", eventId)
      .eq("team_id", team.id)
      .maybeSingle(),
  ]);
  if (
    !membership ||
    !event ||
    event.status !== "scheduled" ||
    new Date(event.starts_at).valueOf() <= new Date().valueOf()
  ) {
    notFound();
  }

  const { data: venue } = event.venue_id
    ? await supabase
        .from("venues")
        .select("name, address")
        .eq("id", event.venue_id)
        .eq("team_id", team.id)
        .maybeSingle()
    : { data: null };

  const durationMinutes = Math.round(
    (new Date(event.ends_at).valueOf() - new Date(event.starts_at).valueOf()) /
      60_000,
  );
  const deadlineMinutes = event.attendance_deadline
    ? Math.round(
        (new Date(event.starts_at).valueOf() -
          new Date(event.attendance_deadline).valueOf()) /
          60_000,
      )
    : 0;
  const editableEvent: EditableEventValues = {
    id: event.id,
    seriesId: event.series_id,
    title: event.title,
    kind: event.kind,
    organizationMode: event.organization_mode,
    sportFormat: event.sport_format,
    startsAtLocal: toLocalDateTime(event.starts_at, team.timezone),
    durationMinutes: String(durationMinutes),
    deadlineMinutes: String(deadlineMinutes),
    opponentName: event.opponent_name ?? "",
    venueName: venue?.name ?? "",
    venueAddress: venue?.address ?? "",
  };

  return (
    <main className="min-h-svh bg-slate-50 text-slate-950">
      <TeamAppHeader currentName={team.name} teams={teams ?? []} />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link
          href={`/app/${team.slug}/events/${event.id}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"
        >
          <ArrowLeft className="size-4" aria-hidden /> Voltar ao evento
        </Link>

        <div className="mt-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            <CalendarClock className="size-4" aria-hidden /> Agenda do time
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Editar evento
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Atualize somente esta ocorrência ou, em uma série, esta e as
            próximas semanas.
          </p>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <AdminEventForm
            teamId={team.id}
            teamSlug={team.slug}
            defaultSportFormat={team.default_sport_format}
            event={editableEvent}
          />
        </section>

        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
          <ListChecks
            className="mt-0.5 size-4 shrink-0 text-emerald-700"
            aria-hidden
          />
          As confirmações já registradas são mantidas após a edição.
        </p>
      </div>
    </main>
  );
}
