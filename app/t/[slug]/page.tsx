/* eslint-disable @next/next/no-img-element */

import { BrandMark } from "@/components/brand-mark";
import { ExpandableText } from "@/components/expandable-text";
import { PublicEventAttendance } from "@/components/public-event-attendance";
import { Button } from "@/components/ui/button";
import {
  getPublicAthletes,
  getPublicTeam,
  getPublicTeamMedia,
  getPublicUpcomingEvents,
} from "@/lib/data/public-team";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Camera,
  Clock3,
  Facebook,
  Globe2,
  Instagram,
  LogIn,
  MapPin,
  Music2,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  UserPlus,
  UsersRound,
  Youtube,
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

const formatLabels = {
  society: "Futebol society",
  futsal: "Futsal",
  field: "Futebol de campo",
};

type PublicEvent = Awaited<ReturnType<typeof getPublicUpcomingEvents>>[number];
type PublicAthlete = Awaited<ReturnType<typeof getPublicAthletes>>[number];
type AttendanceResponse = keyof typeof responseLabels;

export default async function PublicTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/.test(slug)) {
    notFound();
  }

  const [team, athletes, events, gallery] = await Promise.all([
    getPublicTeam(slug),
    getPublicAthletes(slug),
    getPublicUpcomingEvents(slug),
    getPublicTeamMedia(slug),
  ]);
  if (!team?.name || !team.default_sport_format) notFound();

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
  const responseByEvent = new Map(
    (attendance ?? []).map((item) => [item.event_id, item.status]),
  );
  const nextEvent = events[0];
  const laterEvents = events.slice(1);
  const socialLinks = [
    { label: "Instagram", href: team.instagram_url, icon: Instagram },
    { label: "Facebook", href: team.facebook_url, icon: Facebook },
    { label: "YouTube", href: team.youtube_url, icon: Youtube },
    { label: "TikTok", href: team.tiktok_url, icon: Music2 },
    { label: "Site", href: team.website_url, icon: Globe2 },
  ].filter((item): item is typeof item & { href: string } => Boolean(item.href));

  return (
    <main className="min-h-svh bg-[#f5f4ef] pb-12 text-slate-950">
      <header className="relative min-h-[30rem] overflow-hidden bg-slate-950 text-white sm:min-h-[34rem]">
        {team.cover_url ? (
          <img
            src={team.cover_url}
            alt={`Capa do ${team.name}`}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(16,185,129,.32),transparent_40%),radial-gradient(circle_at_10%_90%,rgba(14,165,233,.18),transparent_35%),linear-gradient(145deg,#020617,#052e24)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/25 to-slate-950" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />

        <div className="relative mx-auto flex min-h-[30rem] max-w-5xl flex-col px-5 pb-10 pt-6 sm:min-h-[34rem] sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <BrandMark className="[&_span:last-child]:text-white" />
            <Link
              href={teamLink?.athlete_status === "active" ? "/me" : `/t/${slug}/cadastro`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-slate-950/35 px-4 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-slate-950/60"
            >
              {teamLink?.athlete_status === "active" ? <ShieldCheck className="size-4" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
              {teamLink?.athlete_status === "active" ? "Minha área" : "Quero jogar"}
            </Link>
          </div>

          <div className="mt-auto">
            <div className="flex items-end gap-4 sm:gap-6">
              <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-[1.75rem] border-4 border-white/15 bg-white/10 text-3xl font-black shadow-2xl backdrop-blur sm:size-28">
                {team.logo_url ? (
                  <img src={team.logo_url} alt={`Escudo do ${team.name}`} className="size-full object-cover" />
                ) : (
                  team.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex items-center gap-2 text-emerald-300">
                  <BadgeCheck className="size-4" aria-hidden />
                  <span className="text-[11px] font-black uppercase tracking-[0.16em]">
                    Página oficial
                  </span>
                </div>
                <h1 className="mt-2 text-4xl font-black leading-none tracking-[-0.055em] sm:text-6xl">
                  {team.name}
                </h1>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <MapPin className="size-4 text-emerald-300" aria-hidden />
                {formatLabels[team.default_sport_format]}
              </span>
              <span className="flex items-center gap-2">
                <UsersRound className="size-4 text-emerald-300" aria-hidden />
                {athletes.length} {athletes.length === 1 ? "atleta público" : "atletas públicos"}
              </span>
            </div>

            {socialLinks.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950"
                  >
                    <social.icon className="size-4" aria-hidden />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <nav aria-label="Conteúdo do time" className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f5f4ef]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-8">
          <SectionLink href="#agenda" label="Próximo jogo" />
          {gallery.length ? <SectionLink href="#fotos" label="Fotos" /> : null}
          {laterEvents.length ? <SectionLink href="#calendario" label="Calendário" /> : null}
          {team.about ? <SectionLink href="#sobre" label="Sobre" /> : null}
          <SectionLink href="#bid" label="BID" />
        </div>
      </nav>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:space-y-16 sm:px-8 sm:py-12">

        <section id="agenda" className="scroll-mt-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                A bola vai rolar
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                O próximo é esse
              </h2>
            </div>
            {events.length ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800">
                {events.length} {events.length === 1 ? "data aberta" : "datas abertas"}
              </span>
            ) : null}
          </div>

          {nextEvent ? (
            <FeaturedEventCard
              event={nextEvent}
              response={responseByEvent.get(nextEvent.event_id) ?? "pending"}
              canRespond={teamLink?.athlete_status === "active"}
              teamSlug={slug}
            />
          ) : (
            <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white/60 p-8 text-center">
              <CalendarDays className="mx-auto size-9 text-slate-400" aria-hidden />
              <p className="mt-3 font-bold text-slate-800">A próxima resenha ainda não foi marcada</p>
              <p className="mt-1 text-sm text-slate-500">Quando o time agendar, ela aparece aqui.</p>
            </div>
          )}

          {!userId && events.length ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Já é atleta deste time?</p>
                <p className="mt-1 text-sm text-slate-300">Entre com seu WhatsApp para confirmar presença.</p>
              </div>
              <Button asChild className="h-11 rounded-xl bg-white text-slate-950 hover:bg-emerald-50">
                <Link href={`/auth/login?next=${encodeURIComponent(`/t/${slug}#agenda`)}`}>
                  <LogIn aria-hidden /> Entrar e confirmar
                </Link>
              </Button>
            </div>
          ) : teamLink?.athlete_status === "pending" ? (
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Seu vínculo aguarda aprovação. As confirmações serão liberadas assim que o time aprovar você.
            </p>
          ) : userId && teamLink?.athlete_status !== "active" ? (
            <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
              Solicite entrada no time para participar das chamadas.
            </p>
          ) : null}
        </section>

        {team.about || gallery.length ? (
          <section aria-labelledby="team-content-title">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-emerald-300">
                <Camera className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  Muito além do jogo
                </p>
                <h2 id="team-content-title" className="mt-1 text-3xl font-black tracking-[-0.04em]">
                  A vida do time
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {team.about ? (
                <article id="sobre" className="scroll-mt-24 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-34px_rgba(2,20,14,.5)] sm:p-8">
                  <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                        <Sparkles className="size-4" aria-hidden /> Nossa história
                      </p>
                      <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                        Quem somos
                      </h3>
                      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
                        <UsersRound className="size-4 text-emerald-700" aria-hidden />
                        {athletes.length} {athletes.length === 1 ? "atleta público" : "atletas públicos"}
                      </div>
                    </div>
                    <ExpandableText
                      text={team.about}
                      className="text-base leading-8 text-slate-700 sm:text-lg"
                    />
                  </div>
                </article>
              ) : null}

              {gallery.length ? (
                <div id="fotos" className="scroll-mt-24 overflow-hidden rounded-[1.75rem] bg-slate-950 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-4 px-2 pb-3 pt-1 text-white">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                        Fotos da galera
                      </p>
                      <h3 className="mt-1 text-xl font-black">Nossos momentos</h3>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
                      {gallery.length} {gallery.length === 1 ? "foto" : "fotos"}
                    </span>
                  </div>
                  <div className="grid auto-rows-[7.25rem] grid-cols-2 gap-2 sm:auto-rows-[9rem] sm:grid-cols-3 lg:auto-rows-[10rem] lg:grid-cols-4">
                    {gallery.map((photo) => (
                      <figure
                        key={photo.id}
                        className={`group relative overflow-hidden bg-slate-800 ${photo.isFeatured ? "col-span-2 row-span-2 rounded-[1.35rem] sm:rounded-[1.6rem]" : "rounded-xl sm:rounded-2xl"}`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.altText}
                          loading="lazy"
                          decoding="async"
                          className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        {photo.isFeatured ? (
                          <span className="absolute left-3 top-3 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-amber-300 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-950 shadow-lg sm:left-4 sm:top-4">
                            <Star className="size-3 fill-current" aria-hidden />
                            Em destaque
                          </span>
                        ) : null}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent p-2.5 pt-8 sm:p-3 sm:pt-10">
                          <figcaption
                            className={`line-clamp-2 font-semibold text-white ${photo.isFeatured ? "text-sm leading-5 sm:text-base" : "text-[11px] leading-4 sm:text-xs"}`}
                          >
                            {photo.altText}
                          </figcaption>
                        </div>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {laterEvents.length ? (
          <section id="calendario" className="scroll-mt-24 border-t border-slate-300 pt-8 sm:pt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  Depois do próximo
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Calendário
                </h2>
              </div>
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                +{laterEvents.length}
              </span>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {laterEvents.map((event) => (
                <CompactEventCard
                  key={event.event_id}
                  event={event}
                  response={responseByEvent.get(event.event_id) ?? "pending"}
                  canRespond={teamLink?.athlete_status === "active"}
                  teamSlug={slug}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section id="bid" className="scroll-mt-24 border-t border-slate-300 pt-8 sm:pt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                <BadgeCheck className="size-4" aria-hidden /> BID público
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Quem veste a camisa</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Aqui aparecem somente atletas que escolheram tornar o perfil público.
              </p>
            </div>
            <span className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm sm:block">
              {athletes.length} no elenco
            </span>
          </div>

          {athletes.length ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {athletes.map((athlete) => (
                <PublicAthleteCard
                  key={athlete.registration_number}
                  athlete={athlete}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white/60 p-8 text-center">
              <UsersRound className="mx-auto size-9 text-slate-400" aria-hidden />
              <p className="mt-3 font-bold text-slate-800">O BID público está sendo formado</p>
              <p className="mt-1 text-sm text-slate-500">Os atletas decidem quando seus perfis aparecem aqui.</p>
            </div>
          )}
        </section>

        <section className="relative overflow-hidden rounded-[2rem] bg-emerald-950 p-6 text-white shadow-2xl sm:p-9">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">A próxima resenha começa aqui</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">Vem fazer parte do {team.name}.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100/80">Um único perfil para acompanhar jogos, confirmar presença e construir sua história em vários times.</p>
            </div>
            <Button asChild size="lg" className="h-12 rounded-xl bg-emerald-400 font-black text-emerald-950 hover:bg-emerald-300">
              <Link href={teamLink?.athlete_status === "active" ? "/me" : `/t/${slug}/cadastro`}>
                {teamLink?.athlete_status === "active" ? "Ir para minha área" : "Quero jogar"} <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </div>

      <footer className="mx-auto mt-8 flex max-w-5xl items-center justify-between gap-4 border-t border-slate-300 px-4 pt-8 text-xs text-slate-500 sm:px-8">
        <BrandMark compact />
        <span>Perfil oficial do {team.name}</span>
      </footer>
    </main>
  );
}

function PublicAthleteCard({ athlete }: { athlete: PublicAthlete }) {
  const labels = positionLabels(athlete.positions);
  const content = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-emerald-100 to-slate-200">
        {athlete.photo_url ? (
          <img
            src={athlete.photo_url}
            alt={athlete.display_name ?? "Atleta"}
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-5xl font-black text-emerald-900/30">
            {(athlete.display_name ?? "A").slice(0, 2).toUpperCase()}
          </div>
        )}
        {athlete.shirt_number ? (
          <span className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-slate-950/85 text-sm font-black text-white shadow-lg backdrop-blur">
            {athlete.shirt_number}
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate font-black text-slate-950">
            {athlete.display_name}
          </h3>
          {athlete.player_handle ? (
            <ArrowRight
              className="size-4 shrink-0 text-emerald-700 transition group-hover:translate-x-0.5"
              aria-hidden
            />
          ) : null}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          <Shirt className="size-3.5" aria-hidden /> BID #{athlete.registration_number}
        </p>
        {labels.length ? (
          <p className="mt-2 truncate text-xs text-slate-500">
            {labels.join(" · ")}
          </p>
        ) : null}
      </div>
    </>
  );
  const cardClassName =
    "group block overflow-hidden rounded-[1.5rem] bg-white shadow-[0_15px_40px_-30px_rgba(2,20,14,.65)]";

  return athlete.player_handle ? (
    <Link
      href={`/p/${athlete.player_handle}`}
      className={`${cardClassName} transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-28px_rgba(2,44,34,.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2`}
      aria-label={`Abrir perfil de ${athlete.display_name ?? "atleta"}`}
    >
      {content}
    </Link>
  ) : (
    <article className={cardClassName}>{content}</article>
  );
}

function FeaturedEventCard({
  event,
  response,
  canRespond,
  teamSlug,
}: {
  event: PublicEvent;
  response: AttendanceResponse;
  canRespond: boolean;
  teamSlug: string;
}) {
  const timeZone = event.team_timezone || "America/Sao_Paulo";
  const deadlineClosed = Boolean(
    event.attendance_deadline && new Date(event.attendance_deadline) < new Date(),
  );

  return (
    <article className="relative mt-6 overflow-hidden rounded-[2rem] bg-emerald-950 p-5 text-white shadow-[0_28px_70px_-35px_rgba(2,44,34,.85)] sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em] text-emerald-950">
            <CalendarDays className="size-3.5" aria-hidden /> Próximo jogo
          </span>
          <span className="text-xs font-bold text-emerald-200">
            {kindLabels[event.kind]} · {sportFormatLabel(event.sport_format)}
          </span>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-[9rem_1fr] sm:items-center">
          <div className="grid min-h-36 place-items-center rounded-[1.75rem] bg-white px-4 py-5 text-center text-slate-950 shadow-xl">
            <div>
              <span className="block text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                {new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone })
                  .format(new Date(event.starts_at))}
              </span>
              <span className="mt-1 block text-6xl font-black leading-none tracking-[-0.08em]">
                {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone })
                  .format(new Date(event.starts_at))}
              </span>
              <span className="mt-2 block text-xs font-bold capitalize text-slate-500">
                {new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone })
                  .format(new Date(event.starts_at))}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-3xl font-black leading-tight tracking-[-0.045em] sm:text-4xl">
              {event.title}
            </h3>
            {event.opponent_name ? (
              <p className="mt-2 text-sm font-bold text-emerald-200">
                {event.kind === "weekly_match" ? "Com" : "Contra"} {event.opponent_name}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-slate-200">
              <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4">
                <Clock3 className="size-4 text-emerald-300" aria-hidden />
                {new Intl.DateTimeFormat("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone,
                }).format(new Date(event.starts_at))}
              </span>
              <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 capitalize">
                <CalendarDays className="size-4 text-emerald-300" aria-hidden />
                {new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  timeZone,
                }).format(new Date(event.starts_at))}
              </span>
            </div>
          </div>
        </div>

        {canRespond ? (
          <div className="mt-7 border-t border-white/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.13em] text-emerald-300">
                  Sua presença
                </p>
                <p className="mt-1 text-sm font-bold">{responseLabels[response]}</p>
              </div>
              {event.attendance_deadline ? (
                <p className={`text-xs ${deadlineClosed ? "font-bold text-amber-300" : "text-slate-400"}`}>
                  {deadlineClosed
                    ? "Prazo encerrado"
                    : `Responda até ${new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone,
                      }).format(new Date(event.attendance_deadline))}`}
                </p>
              ) : null}
            </div>
            <PublicEventAttendance
              teamSlug={teamSlug}
              eventId={event.event_id}
              currentStatus={response}
              deadlineClosed={deadlineClosed}
              inverted
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CompactEventCard({
  event,
  response,
  canRespond,
  teamSlug,
}: {
  event: PublicEvent;
  response: AttendanceResponse;
  canRespond: boolean;
  teamSlug: string;
}) {
  const timeZone = event.team_timezone || "America/Sao_Paulo";
  const deadlineClosed = Boolean(
    event.attendance_deadline && new Date(event.attendance_deadline) < new Date(),
  );

  return (
    <article className="flex flex-col rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_16px_42px_-34px_rgba(2,20,14,.6)] sm:p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-slate-950 text-center text-white">
          <div className="leading-none">
            <span className="block text-[9px] font-black uppercase text-emerald-300">
              {new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone })
                .format(new Date(event.starts_at))
                .replace(".", "")}
            </span>
            <span className="mt-1 block text-xl font-black">
              {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone })
                .format(new Date(event.starts_at))}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
            {kindLabels[event.kind]} · {sportFormatLabel(event.sport_format)}
          </p>
          <h3 className="mt-1 line-clamp-2 font-black leading-tight text-slate-950">
            {event.title}
          </h3>
          {event.opponent_name ? (
            <p className="mt-1 truncate text-xs text-slate-500">
              contra {event.opponent_name}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1.5 capitalize">
          <CalendarDays className="size-3.5 text-emerald-700" aria-hidden />
          {new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone })
            .format(new Date(event.starts_at))}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock3 className="size-3.5 text-emerald-700" aria-hidden />
          {new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone,
          }).format(new Date(event.starts_at))}
        </span>
      </div>

      {canRespond ? (
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-slate-600">
              {responseLabels[response]}
            </p>
            {deadlineClosed ? (
              <span className="text-[10px] font-bold text-amber-700">Encerrado</span>
            ) : null}
          </div>
          <PublicEventAttendance
            teamSlug={teamSlug}
            eventId={event.event_id}
            currentStatus={response}
            deadlineClosed={deadlineClosed}
          />
        </div>
      ) : null}
    </article>
  );
}

function sportFormatLabel(format: PublicEvent["sport_format"]) {
  if (format === "field") return "Campo";
  if (format === "futsal") return "Futsal";
  return "Society";
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-950 hover:text-white"
    >
      {label}
    </a>
  );
}

function positionLabels(value: Json) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      typeof item.label === "string"
    ) {
      return [item.label];
    }
    return [];
  });
}
