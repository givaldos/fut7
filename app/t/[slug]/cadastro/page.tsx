import { AthleteRegistrationForm } from "@/components/athlete-registration-form";
import { Button } from "@/components/ui/button";
import { getPublicPositions, getPublicTeam } from "@/lib/data/public-team";
import { getTurnstileConfig } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock3,
  LogIn,
  ShieldCheck,
  UserPlus,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

const linkStatus = {
  pending: {
    icon: Clock3,
    title: "Solicitação em análise",
    description:
      "Seu perfil já foi enviado para este time. Assim que um administrador aprovar, você poderá confirmar presença nos jogos.",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  },
  active: {
    icon: BadgeCheck,
    title: "Você já faz parte deste time",
    description:
      "Seu vínculo está aprovado. Acesse sua área para acompanhar a agenda e confirmar presença.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
  },
  inactive: {
    icon: ShieldCheck,
    title: "Vínculo inativo",
    description:
      "Seu cadastro neste time está inativo. Fale com um administrador do time para reativá-lo.",
    className: "border-slate-200 bg-slate-50 text-slate-900",
  },
  rejected: {
    icon: ShieldCheck,
    title: "Solicitação não aprovada",
    description:
      "Seu cadastro não foi aprovado por este time. Fale com um administrador se precisar de ajuda.",
    className: "border-slate-200 bg-slate-50 text-slate-900",
  },
} as const;

export default async function AthleteRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/.test(slug)) {
    notFound();
  }

  const team = await getPublicTeam(slug);
  if (!team?.default_sport_format) notFound();

  const [positions, nonceHeaders, supabase] = await Promise.all([
    getPublicPositions(team.default_sport_format),
    headers(),
    createClient(),
  ]);
  const { data: auth } = await supabase.auth.getClaims();

  const userId =
    typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;
  const hasVerifiedPhone =
    typeof auth?.claims?.phone === "string" && auth.claims.phone.length > 0;

  const [profileResult, preferencesResult, linksResult] = userId
    ? await Promise.all([
        supabase
          .from("player_profiles")
          .select("display_name, preferred_name, birth_date")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("player_position_preferences")
          .select("position_code")
          .eq("user_id", userId)
          .eq("sport_format", team.default_sport_format)
          .order("priority"),
        supabase.rpc("list_my_player_team_links"),
      ])
    : [
        { data: null, error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (profileResult.error || preferencesResult.error || linksResult.error) {
    throw new Error("Não foi possível carregar seu perfil de atleta.");
  }

  const teamLink = (linksResult.data ?? []).find(
    (link) => link.team_slug === slug,
  );
  const existingProfile =
    profileResult.data && hasVerifiedPhone
      ? {
          fullName: profileResult.data.display_name,
          preferredName: profileResult.data.preferred_name ?? "",
          birthDate: profileResult.data.birth_date ?? "",
          positionCodes: (preferencesResult.data ?? []).map(
            (preference) => preference.position_code,
          ),
        }
      : undefined;
  const nonce = nonceHeaders.get("x-nonce") ?? undefined;
  const turnstile = getTurnstileConfig();
  const loginDestination = `/t/${slug}/cadastro`;
  const showNewRegistration = query.novo === "1";

  return (
    <main className="app-canvas px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-lg">
        <Link
          href={`/t/${slug}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="size-4" aria-hidden /> Voltar para {team.name}
        </Link>

        <section className="app-surface mt-4 p-5 sm:p-8">
          <p className="app-kicker">Perfil de atleta</p>
          <h1 className="app-title mt-3">Entre para o {team.name}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Seu perfil é único e pode ser conectado a vários times. Cada time
            aprova seu vínculo separadamente.
          </p>

          <div className="my-6 h-px bg-slate-100" />

          {teamLink ? (
            <ExistingLinkStatus status={teamLink.athlete_status} />
          ) : existingProfile ? (
            <>
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <UserRoundCheck
                  className="mt-0.5 size-5 shrink-0 text-emerald-700"
                  aria-hidden
                />
                <div>
                  <p className="font-semibold text-emerald-950">
                    Perfil encontrado: {existingProfile.preferredName || existingProfile.fullName}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-emerald-900">
                    Você entrou com o WhatsApp já confirmado. Agora basta revisar
                    os dados e solicitar entrada neste time.
                  </p>
                </div>
              </div>
              <AthleteRegistrationForm
                teamSlug={slug}
                positions={positions}
                existingProfile={existingProfile}
              />
            </>
          ) : showNewRegistration ? (
            <>
              <div className="mb-6 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <UserPlus className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
                <p>
                  Crie seu perfil uma única vez. O WhatsApp será seu acesso sem
                  senha e o perfil poderá acompanhar você em outros times.
                </p>
              </div>
              <AthleteRegistrationForm
                teamSlug={slug}
                positions={positions}
                siteKey={turnstile?.siteKey}
                nonce={nonce}
              />
              <Button asChild variant="ghost" className="mt-3 min-h-11 w-full rounded-xl">
                <Link href={`/t/${slug}/cadastro`}>Voltar às opções de acesso</Link>
              </Button>
            </>
          ) : (
            <RegistrationChoice teamSlug={slug} loginDestination={loginDestination} />
          )}
        </section>
      </div>
    </main>
  );
}

function ExistingLinkStatus({
  status,
}: {
  status: keyof typeof linkStatus;
}) {
  const content = linkStatus[status];
  const Icon = content.icon;

  return (
    <div className={`rounded-3xl border p-6 text-center ${content.className}`}>
      <Icon className="mx-auto size-10" aria-hidden />
      <h2 className="mt-4 text-xl font-bold">{content.title}</h2>
      <p className="mt-2 text-sm leading-6">{content.description}</p>
      <Button
        asChild
        size="lg"
        className="mt-5 h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
      >
        <Link href="/me">
          Abrir minha área <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

function RegistrationChoice({
  teamSlug,
  loginDestination,
}: {
  teamSlug: string;
  loginDestination: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white">
            <LogIn className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Já tenho perfil
            </p>
            <h2 className="mt-1 text-lg font-bold text-emerald-950">
              Entrar com WhatsApp
            </h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900">
              Use o mesmo perfil, histórico e preferências que você já possui.
            </p>
          </div>
        </div>
        <Button
          asChild
          size="lg"
          className="mt-5 h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
        >
          <Link
            href={`/auth/login?next=${encodeURIComponent(loginDestination)}`}
          >
            Entrar com WhatsApp <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          ou
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white">
            <UserPlus className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Primeiro acesso
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">
              Criar perfil de atleta
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Cadastre seus dados e confirme o WhatsApp. Não precisa criar senha.
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="mt-5 h-12 w-full rounded-xl border-slate-300"
        >
          <Link href={`/t/${teamSlug}/cadastro?novo=1`}>
            Fazer meu cadastro <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <UsersRound className="mt-0.5 size-5 shrink-0 text-slate-500" aria-hidden />
        <p>
          Entrar não adiciona você automaticamente: um administrador do time
          ainda precisa aprovar sua participação.
        </p>
      </div>
    </div>
  );
}
