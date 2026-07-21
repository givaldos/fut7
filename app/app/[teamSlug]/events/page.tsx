import { Button } from "@/components/ui/button";
import { AppContainer, PageHeader } from "@/components/ui/app-shell";
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
    const confirmationProgress = call.total
      ? Math.round((call.confirmed / call.total) * 100)
      : 0;
    return (
      <Link key={event.id} href={`/app/${team.slug}/events/${event.id}`} className="app-surface app-interactive group block p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="min-w-14 rounded-2xl bg-slate-950 px-2 py-2.5 text-center text-white shadow-sm">
            <p className="text-[10px] font-bold uppercase text-emerald-300">{new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: team.timezone }).format(new Date(event.starts_at)).replace(".", "")}</p>
            <p className="text-xl font-black">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: team.timezone }).format(new Date(event.starts_at))}</p>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-emerald-700">{kindLabels[event.kind]} · {event.sport_format === "field" ? "Campo" : event.sport_format === "futsal" ? "Futsal" : "Society"}</p>
                <h2 className="mt-1 truncate text-base font-black tracking-tight text-slate-950">{event.title}</h2>
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-300 transition group-hover:text-emerald-700" aria-hidden />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden /> {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: team.timezone }).format(new Date(event.starts_at))}</span>
              {event.venue_id && <span className="flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden /> {venueById.get(event.venue_id)}</span>}
              <span className="flex items-center gap-1.5"><UsersRound className="size-3.5" aria-hidden /> {call.confirmed}/{call.total} confirmados</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${confirmationProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {confirmationProgress}%
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <main className="app-canvas pb-24">
      <TeamAppHeader currentName={team.name} currentSlug={team.slug} teams={teams ?? []} />
      <AppContainer>
        <PageHeader
          eyebrow="Organização"
          title="Agenda"
          description={`${upcoming.length} próximo${upcoming.length === 1 ? " evento" : "s eventos"} · acompanhe chamadas e súmulas em um só lugar.`}
          action={
            <Button asChild>
              <Link href={`/app/${team.slug}/events/new`}><Plus aria-hidden /> <span className="hidden sm:inline">Novo evento</span><span className="sm:hidden">Novo</span></Link>
            </Button>
          }
        />

        <section>
          <p className="app-kicker">Em aberto</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Próximos jogos</h2>
          {upcoming.length ? (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">{upcoming.map(renderEvent)}</div>
          ) : (
            <div className="app-surface mt-3 border-dashed p-8 text-center">
              <CalendarDays className="mx-auto size-8 text-slate-400" aria-hidden />
              <p className="mt-3 font-semibold">Nenhum jogo agendado</p>
              <p className="mt-1 text-sm text-slate-500">Crie um evento avulso ou uma sequência semanal.</p>
              <Button asChild className="mt-5"><Link href={`/app/${team.slug}/events/new`}>Criar primeiro evento</Link></Button>
            </div>
          )}
        </section>

        {history.length > 0 && (
          <section>
            <div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-slate-500" aria-hidden /><h2 className="text-lg font-black tracking-tight">Histórico</h2></div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">{history.map(renderEvent)}</div>
          </section>
        )}
      </AppContainer>
      <TeamBottomNav teamSlug={team.slug} active="events" nextEventId={upcoming[0]?.id} />
    </main>
  );
}
