"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  athleteAvailabilitySchema,
  athleteReviewSchema,
  createAthleteSchema,
} from "@/lib/validation/operations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateAthleteState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export async function createAthlete(
  _previousState: CreateAthleteState,
  formData: FormData,
): Promise<CreateAthleteState> {
  await requireUser();
  const parsed = createAthleteSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    fullName: formData.get("fullName"),
    preferredName: formData.get("preferredName"),
    shirtNumber: formData.get("shirtNumber"),
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    publicProfile: formData.get("publicProfile") === "on",
    positionCodes: formData.getAll("positionCodes"),
  });

  if (!parsed.success) {
    return {
      message: "Revise os campos indicados.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_athlete_as_staff", {
    requested_team_id: parsed.data.teamId,
    athlete_full_name: parsed.data.fullName,
    athlete_preferred_name: parsed.data.preferredName,
    athlete_shirt_number: parsed.data.shirtNumber,
    athlete_birth_date: parsed.data.birthDate,
    athlete_phone_e164: parsed.data.phone,
    athlete_email: parsed.data.email,
    athlete_public_profile: parsed.data.publicProfile,
    position_codes: parsed.data.positionCodes,
  });

  if (error) {
    return {
      message:
        error.code === "22023"
          ? "Há dados inválidos ou posições incompatíveis com a modalidade do time."
          : "Não foi possível cadastrar o atleta. Confira sua permissão e tente novamente.",
    };
  }

  revalidatePath(`/app/${parsed.data.teamSlug}`);
  revalidatePath(`/app/${parsed.data.teamSlug}/athletes`);
  redirect(`/app/${parsed.data.teamSlug}/athletes?created=1`);
}

export async function reviewAthlete(formData: FormData) {
  await requireUser();
  const parsed = athleteReviewSchema.safeParse({
    athleteId: formData.get("athleteId"),
    teamSlug: formData.get("teamSlug"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_athlete_registration", {
    requested_athlete_id: parsed.data.athleteId,
    decision: parsed.data.decision,
  });
  if (error) return;

  revalidatePath(`/app/${parsed.data.teamSlug}`);
  revalidatePath(`/app/${parsed.data.teamSlug}/athletes`);
  revalidatePath(`/app/${parsed.data.teamSlug}/events`);
}

export async function setAthleteAvailability(formData: FormData) {
  await requireUser();
  const parsed = athleteAvailabilitySchema.safeParse({
    athleteId: formData.get("athleteId"),
    teamSlug: formData.get("teamSlug"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_athlete_availability", {
    requested_athlete_id: parsed.data.athleteId,
    next_status: parsed.data.status,
  });
  if (error) return;

  revalidatePath(`/app/${parsed.data.teamSlug}`);
  revalidatePath(`/app/${parsed.data.teamSlug}/athletes`);
}

