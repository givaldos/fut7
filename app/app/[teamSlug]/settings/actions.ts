"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeTeamSocialUrl,
  normalizeWebsiteUrl,
  updateTeamSchema,
} from "@/lib/validation/onboarding";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type UpdateTeamState = {
  message?: string;
  errors?: Partial<
    Record<
      | "name"
      | "sportFormat"
      | "timezone"
      | "about"
      | "instagramUrl"
      | "facebookUrl"
      | "youtubeUrl"
      | "tiktokUrl"
      | "websiteUrl",
      string[]
    >
  >;
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
    about: formData.get("about"),
    instagramUrl: normalizeTeamSocialUrl(
      formData.get("instagramUrl"),
      "instagram",
    ),
    facebookUrl: normalizeTeamSocialUrl(
      formData.get("facebookUrl"),
      "facebook",
    ),
    youtubeUrl: normalizeTeamSocialUrl(
      formData.get("youtubeUrl"),
      "youtube",
    ),
    tiktokUrl: normalizeTeamSocialUrl(formData.get("tiktokUrl"), "tiktok"),
    websiteUrl: normalizeWebsiteUrl(formData.get("websiteUrl")),
  });

  if (!parsed.success) {
    return {
      message: "Revise os dados do time.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_team_social_settings", {
    requested_team_id: parsed.data.teamId,
    requested_slug: parsed.data.currentSlug,
    requested_name: parsed.data.name,
    requested_sport_format: parsed.data.sportFormat,
    requested_timezone: parsed.data.timezone,
    requested_is_public: parsed.data.isPublic,
    requested_about: parsed.data.about ?? "",
    requested_instagram_url: parsed.data.instagramUrl ?? "",
    requested_facebook_url: parsed.data.facebookUrl ?? "",
    requested_youtube_url: parsed.data.youtubeUrl ?? "",
    requested_tiktok_url: parsed.data.tiktokUrl ?? "",
    requested_website_url: parsed.data.websiteUrl ?? "",
  });

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

const mediaRegistrationSchema = z.object({
  teamId: z.string().uuid(),
  teamSlug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/),
  kind: z.enum(["logo", "cover", "gallery"]),
  storagePath: z
    .string()
    .min(50)
    .max(180)
    .regex(
      /^[0-9a-f-]{36}\/(?:logo|cover|gallery)\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/,
    ),
  altText: z.string().trim().max(160).optional(),
});

const mediaDeleteSchema = z.object({
  mediaId: z.string().uuid(),
  teamSlug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/),
});

export type TeamMediaActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function registerTeamMedia(
  formData: FormData,
): Promise<TeamMediaActionResult> {
  await requireUser();
  const parsed = mediaRegistrationSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    kind: formData.get("kind"),
    storagePath: formData.get("storagePath"),
    altText: formData.get("altText")?.toString() || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: "Não foi possível validar essa imagem." };
  }

  if (!parsed.data.storagePath.startsWith(`${parsed.data.teamId}/${parsed.data.kind}/`)) {
    return { ok: false, message: "O endereço da imagem não pertence a este time." };
  }

  const supabase = await createClient();
  const result =
    parsed.data.kind === "gallery"
      ? await supabase.rpc("add_team_gallery_media", {
          requested_team_id: parsed.data.teamId,
          requested_storage_path: parsed.data.storagePath,
          requested_alt_text: parsed.data.altText ?? "",
        })
      : await supabase.rpc("replace_team_identity_media", {
          requested_team_id: parsed.data.teamId,
          requested_kind: parsed.data.kind,
          requested_storage_path: parsed.data.storagePath,
          requested_alt_text: parsed.data.altText ?? "",
        });

  if (result.error) {
    await supabase.storage.from("team_media").remove([parsed.data.storagePath]);
    return {
      ok: false,
      message:
        result.error.code === "54000"
          ? "A galeria já chegou ao limite de 13 fotos."
          : result.error.code === "42501"
            ? "Você não tem permissão para alterar as fotos deste time."
            : "Não foi possível publicar a imagem. Tente novamente.",
    };
  }

  if (
    parsed.data.kind !== "gallery" &&
    typeof result.data === "string" &&
    result.data !== parsed.data.storagePath
  ) {
    await supabase.storage.from("team_media").remove([result.data]);
  }

  revalidatePath(`/app/${parsed.data.teamSlug}/settings`);
  revalidatePath(`/t/${parsed.data.teamSlug}`);
  return {
    ok: true,
    message:
      parsed.data.kind === "gallery"
        ? "Foto adicionada à galeria."
        : parsed.data.kind === "logo"
          ? "Escudo atualizado."
          : "Foto de capa atualizada.",
  };
}

export async function deleteTeamMedia(
  formData: FormData,
): Promise<TeamMediaActionResult> {
  await requireUser();
  const parsed = mediaDeleteSchema.safeParse({
    mediaId: formData.get("mediaId"),
    teamSlug: formData.get("teamSlug"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Não foi possível identificar a imagem." };
  }

  const supabase = await createClient();
  const { data: storagePath, error } = await supabase.rpc("remove_team_media", {
    requested_media_id: parsed.data.mediaId,
  });
  if (error || !storagePath) {
    return {
      ok: false,
      message:
        error?.code === "42501"
          ? "Você não tem permissão para remover esta imagem."
          : "Não foi possível remover a imagem.",
    };
  }

  await supabase.storage.from("team_media").remove([storagePath]);
  revalidatePath(`/app/${parsed.data.teamSlug}/settings`);
  revalidatePath(`/t/${parsed.data.teamSlug}`);
  return { ok: true, message: "Imagem removida." };
}

export async function featureTeamMedia(
  formData: FormData,
): Promise<TeamMediaActionResult> {
  await requireUser();
  const parsed = mediaDeleteSchema.safeParse({
    mediaId: formData.get("mediaId"),
    teamSlug: formData.get("teamSlug"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Não foi possível identificar a imagem." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_team_featured_media", {
    requested_media_id: parsed.data.mediaId,
  });
  if (error || !data) {
    return {
      ok: false,
      message:
        error?.code === "42501"
          ? "Você não tem permissão para escolher o destaque deste time."
          : "Não foi possível destacar a foto.",
    };
  }

  revalidatePath(`/app/${parsed.data.teamSlug}/settings`);
  revalidatePath(`/t/${parsed.data.teamSlug}`);
  return { ok: true, message: "Foto escolhida como destaque da página." };
}
