"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { updateTeamSchema } from "@/lib/validation/onboarding";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type UpdateTeamState = {
  message?: string;
  errors?: Partial<Record<"name" | "sportFormat" | "timezone", string[]>>;
};

export async function updateTeam(
  _previousState: UpdateTeamState,
  formData: FormData,
): Promise<UpdateTeamState> {
  await requireUser();
  const parsed = updateTeamSchema.safeParse({
    teamId: formData.get("teamId"),
    currentSlug: formData.get("currentSlug"),
    name: formData.get("name"),
    sportFormat: formData.get("sportFormat"),
    timezone: formData.get("timezone"),
    isPublic: formData.get("isPublic") === "on",
  });

  if (!parsed.success) {
    return {
      message: "Revise os dados do time.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .update({
      name: parsed.data.name,
      default_sport_format: parsed.data.sportFormat,
      timezone: parsed.data.timezone,
      is_public: parsed.data.isPublic,
    })
    .eq("id", parsed.data.teamId)
    .eq("slug", parsed.data.currentSlug)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    return {
      message: "Não foi possível salvar. Confira sua permissão e tente novamente.",
    };
  }

  revalidatePath(`/app/${parsed.data.currentSlug}`);
  revalidatePath(`/app/${parsed.data.currentSlug}/settings`);
  revalidatePath(`/t/${parsed.data.currentSlug}`);
  redirect(`/app/${parsed.data.currentSlug}/settings?saved=1`);
}
