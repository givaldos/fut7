import { Button } from "@/components/ui/button";
import { AppContainer, PageHeader } from "@/components/ui/app-shell";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Goal,
  Handshake,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  Square,
  Trophy,
  UserRound,
} from "lucide-react";
import Link from "next/link";

type SportFormat = "field" | "society" | "futsal";

const formatLabels: Record<SportFormat, string> = {
  field: "Campo",
  society: "Society",
  futsal: "Futsal",
};

export default async function PlayerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const [
    { data: profile },
    { data: preferences },
    { data: positions },
    { data: statisticsRows },
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
      .select("sport_format, position_code, priority")
      .eq("user_id", user.id)
      .order("priority"),
    supabase
      .from("positions")
      .select("sport_format, code, label")
      .order("sport_format")
      .order("sort_order"),
    supabase.rpc("get_my_player_statistics"),
  ]);
  const query = await searchParams;
  const positionLabelByKey = new Map(
    (positions ?? []).map((position) => [
      `${position.sport_format}:${position.code}`,
      position.label,
    ]),
  );
  const statistics = statisticsRows?.[0] ?? {
    matches_played: 0,
    goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
  };
  const statisticItems: {
    value: number;
    label: string;
    icon: typeof Trophy;
    color: string;
  }[] = [
    {
      value: statistics.matches_played,
      label: "Partidas",
      icon: Trophy,
      color: "text-slate-600",
    },
    {
      value: statistics.goals,
      label: "Gols",
      icon: Goal,
      color: "text-emerald-700",
    },
    {
      value: statistics.assists,
      label: "Assistências",
      icon: Handshake,
      color: "text-sky-700",
    },
    {
      value: statistics.yellow_cards,
      label: "Amarelos",
      icon: Square,
      color: "text-amber-500",
    },
    {
      value: statistics.red_cards,
      label: "Vermelhos",
      icon: ShieldAlert,
      color: "text-red-600",
    },
  ];

  return (
    <AppContainer narrow>
      {query.saved === "1" && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden /> Perfil
          atualizado.
        </div>
      )}

      <PageHeader
        eyebrow="Sua identidade"
        title="Perfil"
        description="Seu cartão esportivo, preferências e privacidade."
        action={profile ? (
          <Button asChild>
            <Link href="/me/perfil/editar"><Pencil aria-hidden /> Editar</Link>
          </Button>
        ) : undefined}
      />

      {profile ? (
        <>
          <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-float">
            <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="relative p-6 sm:p-8">
              <div className="grid size-14 place-items-center rounded-2xl bg-white/10 text-emerald-100">
                <UserRound className="size-7" aria-hidden />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {profile.phone_verified_at && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                    <BadgeCheck className="size-4" aria-hidden /> WhatsApp
                    verificado
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                  {profile.is_public ? (
                    <Eye className="size-4" aria-hidden />
                  ) : (
                    <EyeOff className="size-4" aria-hidden />
                  )}
                  {profile.is_public ? "Perfil público" : "Perfil privado"}
                </span>
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight">
                {profile.preferred_name || profile.display_name}
              </h2>
              {profile.preferred_name && (
                <p className="mt-1 text-sm text-emerald-100">
                  {profile.display_name}
                </p>
              )}
              <p className="mt-4 text-sm text-emerald-200">/p/{profile.handle}</p>
              {profile.is_public && (
                <Link
                  href={`/p/${profile.handle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-100 hover:text-white"
                >
                  Abrir perfil público <ExternalLink className="size-4" aria-hidden />
                </Link>
              )}
            </div>
          </section>

          <section className="app-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Jogos encerrados
                </p>
                <h2 className="mt-1 font-bold">Estatísticas</h2>
              </div>
              <Trophy className="size-5 text-emerald-700" aria-hidden />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {statisticItems.map((item) => {
                const StatIcon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-slate-50 p-3 text-center last:col-span-1"
                  >
                    <StatIcon
                      className={`mx-auto size-4 ${item.color}`}
                      aria-hidden
                    />
                    <p className="mt-2 text-xl font-black">{item.value}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Apenas súmulas encerradas entram neste resumo.
            </p>
          </section>

          <section className="app-surface p-5 sm:p-6">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <ShieldCheck className="size-4" aria-hidden /> Apresentação
            </p>
            <h2 className="mt-4 font-bold">Sobre seu futebol</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {profile.bio ||
                "Você ainda não escreveu uma apresentação sobre seu futebol."}
            </p>
          </section>

          <section className="app-surface p-5 sm:p-6">
            <h2 className="font-bold">Posições preferenciais</h2>
            <p className="mt-1 text-sm text-slate-500">
              A ordem indica sua prioridade em cada modalidade.
            </p>
            {preferences?.length ? (
              <div className="mt-5 space-y-5">
                {(["field", "society", "futsal"] as const).map((format) => {
                  const items = preferences.filter(
                    (preference) => preference.sport_format === format,
                  );
                  if (!items.length) return null;

                  return (
                    <div key={format}>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {formatLabels[format]}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {items.map((preference) => (
                          <span
                            key={preference.position_code}
                            className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                          >
                            {preference.priority}.{" "}
                            {positionLabelByKey.get(
                              `${format}:${preference.position_code}`,
                            ) ?? preference.position_code}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Escolha suas posições para ajudar os times a organizar as
                escalações.
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <UserRound className="size-8" aria-hidden />
          <h2 className="mt-4 text-lg font-bold">Perfil ainda não concluído</h2>
          <p className="mt-2 text-sm leading-6">
            Volte ao link público do time e conclua a confirmação por WhatsApp
            para criar sua identidade de atleta.
          </p>
        </section>
      )}
    </AppContainer>
  );
}
