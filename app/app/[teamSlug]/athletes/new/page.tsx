import { AdminAthleteForm } from "@/components/admin-athlete-form";
import { TeamAppHeader } from "@/components/team-app-header";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function NewAthletePage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const user = await requireUser();
  const { teamSlug } = await params;
  const supabase = await createClient();
  const [{ data: team }, { data: teams }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, slug, default_sport_format")
      .eq("slug", teamSlug)
      .maybeSingle(),
    supabase.from("teams").select("name, slug").order("name"),
  ]);
  if (!team) notFound();

  const [{ data: membership }, { data: positions }] = await Promise.all([
    supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("positions")
      .select("code, label")
      .eq("sport_format", team.default_sport_format)
      .order("sort_order"),
  ]);
  if (!membership) notFound();

  return (
    <main className="min-h-svh bg-slate-50 text-slate-950">
      <TeamAppHeader currentName={team.name} teams={teams ?? []} />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link href={`/app/${team.slug}/athletes`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800">
          <ArrowLeft className="size-4" aria-hidden /> Voltar ao BID
        </Link>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Cadastro administrativo</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Novo atleta</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            O atleta entra ativo. Dados de contato ficam visíveis apenas para a administração.
          </p>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <AdminAthleteForm teamId={team.id} teamSlug={team.slug} positions={positions ?? []} />
        </section>

        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
          Cadastro auditado e isolado por time. O contato não integra o perfil público sem autorização explícita.
        </p>
      </div>
    </main>
  );
}

