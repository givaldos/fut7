import { Button } from "@/components/ui/button";
import { TeamAppHeader } from "@/components/team-app-header";
import { TeamBottomNav } from "@/components/team-bottom-nav";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
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

export default async function EventsPage({ params }: { params: Promise<{ teamSlug: string }> }) {
  const user = await requireUser();
  const { teamSlug } = await params;
  const supabase = await createClient();
  const [{ data: team }, { data: teams }] = await Promise.all([
    supabase.from("teams").select("id, name, slug, timezone").eq("slug", teamSlug).maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);
  if (!team) notFound();

  const [{ data: membership }, { data: events }] = await Promise.all([
    supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, title, kind, organization_mode, sport_format, starts_at, ends_at, status, opponent_name, venue_id")
      .eq("team_id", team.id)
      .order("starts_at", { ascending: true })
      .limit(200),
  ]);
  if (!membership) notFound();

  const eventIds = (events ?? []).map((event) => event.id);
  const venueIds = [...new Set((events ?? []).flatMap((event) => (event.venue_id ? [event.venue_id] : [])))];
  const [{ data: attendance }, { data: venues }] = await Promise.all([
    eventIds.length
      ? supabase.from("event_attendance").select("event_id, status").in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    venueIds.length
      ? supabase.from("venues").select("id, name").in("id", venueIds)
      : Promise.resolve({ data: [] }),
  ]);

  const attendanceByEvent = new Map<string, { total: number; confirmed: number }>();
  for (const response of attendance ?? []) {
    const current = attendanceByEvent.get(response.event_id) ?? { total: 0, confirmed: 0 };
    current.total += 1;
    if (response.status === "confirmed") current.confirmed += 1;
    attendanceByEvent.set(response.event_id, current);
  }
  const venueById = new Map((venues ?? []).map((venue) => [venue.id, venue.name]));
  const now = new Date().toISOString();
  const upcoming = (events ?? []).filter((event) => event.status === "scheduled" && event.starts_at >= now);
  const history = (events ?? []).filter((event) => event.status !== "scheduled" || event.starts_at < now).reverse();

  const renderEvent = (event: NonNullable<typeof events>[number]) => {
    const call = attendanceByEvent.get(event.id) ?? { total: 0, confirmed: 0 };
    return (
      <Link key={event.id} href={`/app/${team.slug}/events/${event.id}`} className="group block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300">
        <div className="flex items-start gap-4">
          <div className="min-w-14 rounded-2xl bg-emerald-50 px-2 py-2 text-center text-emerald-800">
            <p className="text-[10px] font-bold uppercase">{new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: team.timezone }).format(new Date(event.starts_at)).replace(".", "")}</p>
            <p className="text-xl font-black">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: team.timezone }).format(new Date(event.starts_at))}</p>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-emerald-700">{kindLabels[event.kind]} · {event.sport_format === "field" ? "Campo" : event.sport_format === "futsal" ? "Futsal" : "Society"}</p>
                <h2 className="mt-1 truncate font-bold text-slate-950">{event.title}</h2>
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-300 transition group-hover:text-emerald-700" aria-hidden />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden /> {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: team.timezone }).format(new Date(event.starts_at))}</span>
              {event.venue_id && <span className="flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden /> {venueById.get(event.venue_id)}</span>}
              <span className="flex items-center gap-1.5"><UsersRound className="size-3.5" aria-hidden /> {call.confirmed}/{call.total} confirmados</span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <main className="min-h-svh bg-slate-50 pb-24 text-slate-950">
      <TeamAppHeader currentName={team.name} teams={teams ?? []} />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        <section className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Organização</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Agenda</h1>
            <p className="mt-1 text-sm text-slate-600">{upcoming.length} próximos eventos</p>
          </div>
          <Button asChild className="h-11 rounded-xl bg-emerald-700 px-3 hover:bg-emerald-800 sm:px-4">
            <Link href={`/app/${team.slug}/events/new`}><Plus aria-hidden /> Novo evento</Link>
          </Button>
        </section>

        <section>
          <h2 className="font-bold">Próximos</h2>
          {upcoming.length ? (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">{upcoming.map(renderEvent)}</div>
          ) : (
            <div className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <CalendarDays className="mx-auto size-8 text-slate-400" aria-hidden />
              <p className="mt-3 font-semibold">Nenhum jogo agendado</p>
              <p className="mt-1 text-sm text-slate-500">Crie um evento avulso ou uma sequência semanal.</p>
              <Button asChild className="mt-5 h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800"><Link href={`/app/${team.slug}/events/new`}>Criar primeiro evento</Link></Button>
            </div>
          )}
        </section>

        {history.length > 0 && (
          <section>
            <div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-slate-500" aria-hidden /><h2 className="font-bold">Histórico</h2></div>
            <div className="mt-3 grid gap-3 opacity-75 lg:grid-cols-2">{history.map(renderEvent)}</div>
          </section>
        )}
      </div>
      <TeamBottomNav teamSlug={team.slug} active="events" nextEventId={upcoming[0]?.id} />
    </main>
  );
}
