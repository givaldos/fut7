import { setEventAttendance } from "@/app/app/[teamSlug]/events/actions";
import { Button } from "@/components/ui/button";
import { TeamAppHeader } from "@/components/team-app-header";
import { TeamBottomNav } from "@/components/team-bottom-nav";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  CircleHelp,
  Clock3,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  X,
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

const statusLabels = {
  pending: "Sem resposta",
  confirmed: "Confirmado",
  declined: "Não vai",
  maybe: "Talvez",
  waitlist: "Espera",
};

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string; eventId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireUser();
  const { teamSlug, eventId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: team }, { data: teams }] = await Promise.all([
    supabase.from("teams").select("id, name, slug, timezone").eq("slug", teamSlug).maybeSingle(),
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
      .select("id, title, kind, organization_mode, sport_format, starts_at, ends_at, attendance_deadline, status, opponent_name, venue_id")
      .eq("id", eventId)
      .eq("team_id", team.id)
      .maybeSingle(),
  ]);
  if (!membership || !event) notFound();

  const [{ data: athletes }, { data: attendance }, { data: venue }] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, full_name, preferred_name, shirt_number, status")
      .eq("team_id", team.id)
      .in("status", ["active", "inactive"])
      .order("preferred_name", { nullsFirst: false })
      .order("full_name"),
    supabase
      .from("event_attendance")
      .select("athlete_id, status, source, responded_at")
      .eq("event_id", event.id),
    event.venue_id
      ? supabase.from("venues").select("name, address").eq("id", event.venue_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const attendanceByAthlete = new Map((attendance ?? []).map((response) => [response.athlete_id, response]));
  const call = (athletes ?? []).map((athlete) => ({
    ...athlete,
    response: attendanceByAthlete.get(athlete.id) ?? {
      athlete_id: athlete.id,
      status: "pending" as const,
      source: "admin" as const,
      responded_at: null,
    },
  }));
  const counts = {
    confirmed: call.filter((item) => item.response.status === "confirmed").length,
    maybe: call.filter((item) => item.response.status === "maybe").length,
    declined: call.filter((item) => item.response.status === "declined").length,
    pending: call.filter((item) => item.response.status === "pending").length,
  };
  const confirmed = call.filter((item) => item.response.status === "confirmed");
  const isScheduled = event.status === "scheduled";

  return (
    <main className="min-h-svh bg-slate-50 pb-24 text-slate-950">
      <TeamAppHeader currentName={team.name} teams={teams ?? []} />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        {query.created === "1" && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
            <BadgeCheck className="size-5 shrink-0" aria-hidden /> Evento criado e chamada aberta para o elenco ativo.
          </div>
        )}

        <Link href={`/app/${team.slug}/events`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800">
          <ArrowLeft className="size-4" aria-hidden /> Voltar à agenda
        </Link>

        <section className="rounded-3xl bg-emerald-950 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-200">
            <span>{kindLabels[event.kind]}</span><span>·</span>
            <span>{event.sport_format === "field" ? "Campo" : event.sport_format === "futsal" ? "Futsal" : "Society"}</span><span>·</span>
            <span>{event.organization_mode === "split_teams" ? "Dividir times" : "Time único"}</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{event.title}</h1>
          {event.opponent_name && <p className="mt-1 text-sm text-emerald-100">vs. {event.opponent_name}</p>}
          <div className="mt-6 grid gap-3 text-sm text-emerald-50 sm:grid-cols-3">
            <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden /> {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: team.timezone }).format(new Date(event.starts_at))}</p>
            <p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden /> {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: team.timezone }).format(new Date(event.starts_at))}</p>
            {venue && <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden /> <span>{venue.name}{venue.address ? <small className="block text-emerald-200">{venue.address}</small> : null}</span></p>}
          </div>
        </section>

        <section className="grid grid-cols-4 gap-2">
          {[
            ["Confirmados", counts.confirmed, "text-emerald-700"],
            ["Talvez", counts.maybe, "text-amber-700"],
            ["Não vão", counts.declined, "text-red-700"],
            ["Pendentes", counts.pending, "text-slate-600"],
          ].map(([label, value, color]) => (
            <article key={label as string} className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500 sm:text-xs">{label}</p>
            </article>
          ))}
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div><h2 className="font-bold">Chamada</h2><p className="mt-1 text-xs text-slate-500">A administração pode registrar a resposta recebida pelo WhatsApp.</p></div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{call.length} atletas</span>
          </div>
          {call.length ? (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {call.map((athlete) => {
                const disabled = !isScheduled || athlete.status !== "active";
                return (
                  <article key={athlete.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">{athlete.shirt_number ?? <UsersRound className="size-4" aria-hidden />}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{athlete.preferred_name || athlete.full_name}</h3>
                        <p className="text-xs text-slate-500">{athlete.status === "inactive" ? "Atleta inativo" : statusLabels[athlete.response.status]}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-1.5">
                      {[
                        ["confirmed", "Vai", Check, "data-[active=true]:border-emerald-600 data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-800"],
                        ["maybe", "Talvez", CircleHelp, "data-[active=true]:border-amber-500 data-[active=true]:bg-amber-50 data-[active=true]:text-amber-800"],
                        ["declined", "Não", X, "data-[active=true]:border-red-500 data-[active=true]:bg-red-50 data-[active=true]:text-red-700"],
                        ["pending", "Limpar", Clock3, "data-[active=true]:border-slate-500 data-[active=true]:bg-slate-100"],
                      ].map(([status, label, Icon, activeClass]) => {
                        const StatusIcon = Icon as typeof Check;
                        return (
                          <form key={status as string} action={setEventAttendance}>
                            <input type="hidden" name="teamSlug" value={team.slug} />
                            <input type="hidden" name="eventId" value={event.id} />
                            <input type="hidden" name="athleteId" value={athlete.id} />
                            <input type="hidden" name="status" value={status as string} />
                            <button type="submit" disabled={disabled} data-active={athlete.response.status === status} aria-label={`${label} — ${athlete.preferred_name || athlete.full_name}`} className={`flex min-h-11 w-full flex-col items-center justify-center rounded-xl border border-slate-200 text-[10px] font-semibold text-slate-500 disabled:cursor-not-allowed disabled:opacity-40 ${activeClass}`}>
                              <StatusIcon className="mb-0.5 size-4" aria-hidden /> {label as string}
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center"><UsersRound className="mx-auto size-8 text-slate-400" aria-hidden /><p className="mt-3 font-semibold">Nenhum atleta na chamada</p><Button asChild className="mt-4 h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800"><Link href={`/app/${team.slug}/athletes/new`}>Cadastrar atleta</Link></Button></div>
          )}
        </section>

        <section id="lineup" className="scroll-mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700"><UserRoundCheck className="size-5" aria-hidden /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Base da escala</p>
              <h2 className="mt-1 text-lg font-bold text-emerald-950">{confirmed.length} atletas confirmados</h2>
              <p className="mt-1 text-sm leading-6 text-emerald-900/80">Somente confirmados entram na base para dividir os times ou montar a escala oficial.</p>
            </div>
          </div>
          {confirmed.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{confirmed.map((athlete) => <span key={athlete.id} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm">{athlete.preferred_name || athlete.full_name}</span>)}</div>}
          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-white/70 p-3 text-xs leading-5 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> O editor tático e a divisão equilibrada de times serão o próximo incremento sobre esta lista confirmada.</div>
        </section>
      </div>
      <TeamBottomNav teamSlug={team.slug} active="events" nextEventId={event.id} />
    </main>
  );
}

