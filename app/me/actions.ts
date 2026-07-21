"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  playerAttendanceSchema,
  playerProfileSchema,
} from "@/lib/validation/operations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type PlayerProfileState = {
  status?: "success" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

const playerPhotoSchema = z.object({
  storagePath: z
    .string()
    .min(80)
    .max(180)
    .regex(
      /^[0-9a-f-]{36}\/profile\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/,
    ),
});

export type PlayerPhotoActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

async function revalidatePlayerPhotoPages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const [{ data: profile }, { data: links }] = await Promise.all([
    supabase
      .from("player_profiles")
      .select("handle")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("list_my_player_team_links"),
  ]);

  revalidatePath("/me");
  revalidatePath("/me/perfil");
  revalidatePath("/me/perfil/editar");
  if (profile?.handle) revalidatePath(`/p/${profile.handle}`);
  for (const link of links ?? []) {
    if (link.team_slug) revalidatePath(`/t/${link.team_slug}`);
  }
}

export async function registerMyPlayerPhoto(
  formData: FormData,
): Promise<PlayerPhotoActionResult> {
  const user = await requireUser();
  const parsed = playerPhotoSchema.safeParse({
    storagePath: formData.get("storagePath"),
  });
  if (
    !parsed.success ||
    !parsed.data.storagePath.startsWith(`${user.id}/profile/`)
  ) {
    return { ok: false, message: "Não foi possível validar essa foto." };
  }

  const supabase = await createClient();
  const { data: previousPath, error } = await supabase.rpc(
    "replace_my_player_photo",
    { requested_storage_path: parsed.data.storagePath },
  );
  if (error) {
    await supabase.storage
      .from("athlete_avatars")
      .remove([parsed.data.storagePath]);
    return {
      ok: false,
      message:
        error.code === "42501"
          ? "Sua sessão expirou. Entre novamente para trocar a foto."
          : "Não foi possível salvar a foto agora.",
    };
  }

  if (
    typeof previousPath === "string" &&
    previousPath !== parsed.data.storagePath
  ) {
    await supabase.storage.from("athlete_avatars").remove([previousPath]);
  }
  await revalidatePlayerPhotoPages(supabase, user.id);
  return { ok: true, message: "Foto de perfil atualizada." };
}

export async function removeMyPlayerPhoto(): Promise<PlayerPhotoActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: previousPath, error } = await supabase.rpc(
    "remove_my_player_photo",
  );
  if (error) {
    return {
      ok: false,
      message:
        error.code === "42501"
          ? "Sua sessão expirou. Entre novamente para remover a foto."
          : "Não foi possível remover a foto agora.",
    };
  }

  if (typeof previousPath === "string") {
    await supabase.storage.from("athlete_avatars").remove([previousPath]);
  }
  await revalidatePlayerPhotoPages(supabase, user.id);
  return { ok: true, message: "Foto de perfil removida." };
}

export async function updateMyPlayerProfile(
  _previousState: PlayerProfileState,
  formData: FormData,
): Promise<PlayerProfileState> {
  const user = await requireUser();
  const parsed = playerProfileSchema.safeParse({
    handle: formData.get("handle"),
    displayName: formData.get("displayName"),
    preferredName: formData.get("preferredName"),
    bio: formData.get("bio"),
    isPublic: formData.get("isPublic") === "on",
    fieldPositions: formData.getAll("fieldPositions"),
    societyPositions: formData.getAll("societyPositions"),
    futsalPositions: formData.getAll("futsalPositions"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos indicados.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: existingProfile } = await supabase
    .from("player_profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: handle, error } = await supabase.rpc("update_my_player_profile", {
    requested_handle: parsed.data.handle,
    requested_display_name: parsed.data.displayName,
    requested_preferred_name: parsed.data.preferredName ?? "",
    requested_bio: parsed.data.bio ?? "",
    requested_is_public: parsed.data.isPublic,
    field_positions: parsed.data.fieldPositions,
    society_positions: parsed.data.societyPositions,
    futsal_positions: parsed.data.futsalPositions,
  });

  if (error || !handle) {
    return {
      status: "error",
      message:
        error?.code === "23505"
          ? "Este endereço público já está em uso. Escolha outro."
          : error?.code === "54000"
            ? "O endereço público só pode ser alterado uma vez a cada 30 dias."
            : "Não foi possível salvar o perfil agora.",
    };
  }

  revalidatePath("/me");
  revalidatePath("/me/perfil");
  revalidatePath("/me/perfil/editar");
  if (existingProfile?.handle && existingProfile.handle !== handle) {
    revalidatePath(`/p/${existingProfile.handle}`);
  }
  revalidatePath(`/p/${handle}`);
  redirect("/me/perfil?saved=1");
}

export async function respondToEventAsPlayer(formData: FormData) {
  await requireUser();
  const parsed = playerAttendanceSchema.safeParse({
    eventId: formData.get("eventId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_event_as_player", {
    requested_event_id: parsed.data.eventId,
    response_status: parsed.data.status,
  });
  if (!error) {
    revalidatePath("/me");
    revalidatePath("/me/agenda");
  }
}
