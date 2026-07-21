import {
  acceptTeamInvitation,
  declineTeamInvitation,
} from "@/app/app/invitation-actions";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Plus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AppIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const [
    { data: memberships, error: membershipsError },
    { data: invitations, error: invitationsError },
    { data: playerProfile, error: playerProfileError },
  ] =
    await Promise.all([
      supabase
        .from("team_memberships")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase.rpc("list_my_team_invitations"),
      supabase.from("player_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);

  if (membershipsError || invitationsError || playerProfileError) {
    throw new Error("Não foi possível carregar seu acesso aos times.");
  }

  const membershipTeamIds = (memberships ?? []).map((membership) => membership.team_id);
  const { data: teams, error: teamsError } = membershipTeamIds.length
    ? await supabase
        .from("teams")
        .select("name, slug")
        .in("id", membershipTeamIds)
        .order("name")
    : { data: [], error: null };
  if (teamsError) throw new Error("Não foi possível carregar seus times administrados.");

  const pendingInvitations = invitations ?? [];
  const firstTeam = teams?.[0];
  if (!pendingInvitations.length && firstTeam?.slug) {
    redirect(`/app/${firstTeam.slug}`);
  }
  if (!pendingInvitations.length && !firstTeam && playerProfile) {
    redirect("/me");
  }

  const query = await searchParams;

  return (
    <main className="app-canvas pb-10">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-3xl items-center justify-between px-4 sm:px-6">
          <BrandMark href="/app" />
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-12">
        {query.invite === "unavailable" && (
          <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            O convite não está mais disponível. Peça um novo link ao administrador do time.
          </p>
        )}

        {pendingInvitations.length ? (
          <>
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Convites encontrados
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Escolha onde entrar em campo
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Seu e-mail foi convidado para colaborar. O acesso só será criado depois da sua confirmação.
              </p>
            </section>

            <section className="space-y-3" aria-label="Convites pendentes">
              {pendingInvitations.map((invitation) => (
                <article
                  key={invitation.invitation_id}
                  className="app-surface border-emerald-200 p-5 sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
                      <BadgeCheck className="size-6" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold">{invitation.team_name}</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {invitation.invited_by_name} convidou você como {invitation.invited_role === "admin" ? "administrador" : "organizador"}.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                    <form action={acceptTeamInvitation}>
                      <input type="hidden" name="invitationId" value={invitation.invitation_id} />
                      <Button type="submit" className="h-11 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800">
                        Aceitar e entrar <ArrowRight aria-hidden />
                      </Button>
                    </form>
                    <form action={declineTeamInvitation}>
                      <input type="hidden" name="invitationId" value={invitation.invitation_id} />
                      <Button type="submit" variant="ghost" className="h-11 rounded-xl">Recusar</Button>
                    </form>
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : (
          <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-float sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-emerald-200">
              <ShieldCheck className="size-6" aria-hidden />
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
              Sua conta está pronta
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Organize o primeiro jogo</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100">
              Crie seu time agora. Se você recebeu um convite, ele aparecerá aqui automaticamente depois que entrar com o e-mail convidado.
            </p>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="app-surface p-5">
            <div className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
              <Plus className="size-5" aria-hidden />
            </div>
            <h2 className="mt-5 text-lg font-bold">Criar meu time</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Configure nome, modalidade e página pública em menos de um minuto.
            </p>
            <Button asChild size="lg" className="mt-5 h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800">
              <Link href="/app/new-team">Começar agora</Link>
            </Button>
          </article>

          <article className="app-surface p-5">
            <div className="grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
              <UsersRound className="size-5" aria-hidden />
            </div>
            <h2 className="mt-5 text-lg font-bold">Recebi um convite</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Abra o link recebido e confirme que você entrou com o mesmo e-mail do convite.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <CalendarCheck className="size-4 shrink-0" aria-hidden />
              Convites válidos aparecem automaticamente nesta tela.
            </div>
          </article>
        </section>

        {firstTeam?.slug && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/app/${firstTeam.slug}`}>Ir para {firstTeam.name}</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
