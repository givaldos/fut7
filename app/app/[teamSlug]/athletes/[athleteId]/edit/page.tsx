import { AdminAthleteEditForm } from "@/components/admin-athlete-edit-form";
import { TeamAppHeader } from "@/components/team-app-header";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, BadgeCheck, UserCog } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditAthletePage({
  params,
}: {
  params: Promise<{ teamSlug: string; athleteId: string }>;
}) {
  const user = await requireUser();
  const { teamSlug, athleteId } = await params;
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

  const [{ data: membership }, { data: athlete }, { data: positions }] =
    await Promise.all([
      supabase
        .from("team_memberships")
        .select("role")
        .eq("team_id", team.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .in("role", ["owner", "admin"])
        .maybeSingle(),
      supabase
        .from("athletes")
        .select(
          "id, user_id, full_name, preferred_name, shirt_number, public_profile, removed_at",
        )
        .eq("id", athleteId)
        .eq("team_id", team.id)
        .is("removed_at", null)
        .maybeSingle(),
      supabase
        .from("positions")
        .select("code, label")
        .eq("sport_format", team.default_sport_format)
        .order("sort_order"),
    ]);
  if (!membership || !athlete) notFound();

  const [{ data: privateData }, { data: preferences }] = await Promise.all([
    supabase
      .from("athlete_private")
      .select("birth_date, phone_e164, email, notes")
      .eq("athlete_id", athlete.id)
      .maybeSingle(),
    supabase
      .from("athlete_position_preferences")
      .select("position_code")
      .eq("athlete_id", athlete.id)
      .eq("sport_format", team.default_sport_format)
      .order("priority"),
  ]);
  const playerOwned = Boolean(athlete.user_id);

  return (
    <main className="app-canvas">
      <TeamAppHeader
        currentName={team.name}
        currentSlug={team.slug}
        teams={teams ?? []}
      />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={`/app/${team.slug}/athletes`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"
        >
          <ArrowLeft className="size-4" aria-hidden /> Voltar ao BID
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <UserCog className="size-5" aria-hidden />
          </span>
          <div>
            <p className="app-kicker">Gestão do atleta</p>
            <h1 className="app-title mt-1">
              {athlete.preferred_name || athlete.full_name}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
              {playerOwned ? (
                <>
                  <BadgeCheck className="size-4 text-sky-700" aria-hidden />
                  Identidade verificada e controlada pelo atleta
                </>
              ) : (
                "Cadastro ainda controlado pelo time"
              )}
            </p>
          </div>
        </div>

        <section className="app-surface mt-6 p-5 sm:p-7">
          <AdminAthleteEditForm
            teamSlug={team.slug}
            positions={positions ?? []}
            athlete={{
              id: athlete.id,
              fullName: athlete.full_name,
              preferredName: athlete.preferred_name ?? "",
              shirtNumber: athlete.shirt_number?.toString() ?? "",
              birthDate: privateData?.birth_date ?? "",
              phone: privateData?.phone_e164 ?? "",
              email: privateData?.email ?? "",
              publicProfile: athlete.public_profile,
              notes: privateData?.notes ?? "",
              positionCodes: (preferences ?? []).map(
                (preference) => preference.position_code,
              ),
              playerOwned,
            }}
          />
        </section>
      </div>
    </main>
  );
}
