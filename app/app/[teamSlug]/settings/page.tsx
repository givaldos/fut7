import { revokeTeamInvitation } from "@/app/app/team-actions";
import { AdminInviteForm } from "@/components/admin-invite-form";
import { TeamAppHeader } from "@/components/team-app-header";
import { TeamBottomNav } from "@/components/team-bottom-nav";
import { TeamSettingsForm } from "@/components/team-settings-form";
import { AppContainer } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Settings,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function TeamSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const [{ teamSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [
    { data: team },
    { data: teams },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, slug, default_sport_format, timezone, is_public")
      .eq("slug", teamSlug)
      .maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);
  if (!team) notFound();

  const [{ data: membership }, { data: pendingInvitations, error: invitationsError }] =
    await Promise.all([
      supabase
        .from("team_memberships")
        .select("role")
        .eq("team_id", team.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("team_invitations")
        .select("id, email, role, expires_at")
        .eq("team_id", team.id)
        .eq("status", "pending")
        .gt("expires_at", now)
        .order("created_at", { ascending: false }),
    ]);
  if (!membership) redirect("/me");
  if (membership.role === "manager") redirect(`/app/${team.slug}`);
  if (invitationsError) throw new Error("Não foi possível carregar os convites.");

  return (
    <main className="app-canvas min-h-screen pb-24">
      <TeamAppHeader currentName={team.name} currentSlug={team.slug} teams={teams ?? []} />

      <AppContainer narrow className="space-y-5 sm:space-y-7">
        <div>
          <Link
            href={`/app/${team.slug}`}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft className="size-4" aria-hidden /> Voltar para o início
          </Link>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <p className="app-kicker">Identidade do time</p>
              <h1 className="app-title mt-2">Deixe tudo com a sua cara</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ajuste como o time aparece e quem ajuda na organização.
              </p>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-emerald-300">
              <Settings className="size-5" aria-hidden />
            </span>
          </div>
        </div>

        {query.saved === "1" ? (
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <BadgeCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-bold">Time atualizado</p>
              <p className="mt-1 text-sm text-emerald-800">As mudanças já aparecem nas áreas pública e administrativa.</p>
            </div>
          </div>
        ) : null}

        <section className="app-surface p-5 sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">Perfil do time</h2>
              <p className="mt-1 text-sm text-slate-500">Informações usadas na agenda e na página pública.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href={`/t/${team.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden /> Ver página
              </Link>
            </Button>
          </div>
          <TeamSettingsForm
            team={{
              id: team.id,
              name: team.name,
              slug: team.slug,
              defaultSportFormat: team.default_sport_format,
              timezone: team.timezone,
              isPublic: team.is_public,
            }}
          />
        </section>

        <section className="app-surface p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <UserPlus className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-black text-slate-950">Quem organiza com você</h2>
              <p className="text-xs text-slate-500">Convites protegidos e confirmados por e-mail</p>
            </div>
          </div>
          <div className="mt-6">
            <AdminInviteForm
              teamId={team.id}
              teamSlug={team.slug}
              canInviteAdmin={membership.role === "owner"}
            />
          </div>

          <div className="mt-7 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-slate-900">Aguardando resposta</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {pendingInvitations?.length ?? 0}
              </span>
            </div>
            {pendingInvitations?.length ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {pendingInvitations.map((invitation) => (
                  <li key={invitation.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{invitation.email}</p>
                      <p className="text-xs text-slate-500">
                        {invitation.role === "admin" ? "Administrador" : "Organizador"} · convite ativo
                      </p>
                    </div>
                    <form action={revokeTeamInvitation}>
                      <input type="hidden" name="invitationId" value={invitation.id} />
                      <input type="hidden" name="teamSlug" value={team.slug} />
                      <Button type="submit" size="sm" variant="ghost">Revogar</Button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Nenhum convite aguardando resposta.
              </p>
            )}
          </div>
        </section>
      </AppContainer>

      <TeamBottomNav teamSlug={team.slug} active="settings" />
    </main>
  );
}
