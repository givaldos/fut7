import { PlayerProfileForm } from "@/components/player-profile-form";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditPlayerProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [
    { data: profile },
    { data: preferences },
    { data: positions },
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
  ]);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Link
        href="/me/perfil"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"
      >
        <ArrowLeft className="size-4" aria-hidden /> Voltar ao perfil
      </Link>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Seus dados
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Editar perfil
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Atualize sua identidade esportiva, posições e privacidade.
        </p>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <PlayerProfileForm
          profile={profile}
          positions={
            (positions ?? []) as Parameters<
              typeof PlayerProfileForm
            >[0]["positions"]
          }
          preferences={
            (preferences ?? []) as Parameters<
              typeof PlayerProfileForm
            >[0]["preferences"]
          }
        />
      </section>

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-emerald-700"
          aria-hidden
        />
        Telefone e dados privados não aparecem no perfil público.
      </p>
    </div>
  );
}
