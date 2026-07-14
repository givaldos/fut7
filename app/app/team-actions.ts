"use server";

import { requireUser } from "@/lib/auth/dal";
import { getAppUrl } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import { createInvitationSchema } from "@/lib/validation/onboarding";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type CreateInvitationState = {
  message?: string;
  inviteUrl?: string;
  expiresAt?: string;
  errors?: Partial<Record<"email" | "role", string[]>>;
};

export async function createTeamInvitation(
  _previousState: CreateInvitationState,
  formData: FormData,
): Promise<CreateInvitationState> {
  await requireUser();
  const parsed = createInvitationSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      message: "Revise os dados do convite.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_team_invitation", {
    requested_team_id: parsed.data.teamId,
    invited_email: parsed.data.email,
    invited_role: parsed.data.role,
  });
  const invitation = data?.[0];

  if (error || !invitation) {
    return {
      message:
        error?.code === "23505"
          ? "Essa pessoa já participa do time."
          : "Não foi possível gerar o convite. Confira sua permissão e tente novamente.",
    };
  }

  const inviteUrl = new URL(
    `/invite/${invitation.invite_token}`,
    getAppUrl(),
  ).toString();
  revalidatePath(`/app/${parsed.data.teamSlug}`);

  return {
    message: "Convite pronto para compartilhar.",
    inviteUrl,
    expiresAt: invitation.invitation_expires_at,
  };
}

const revokeInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  teamSlug: z.string().min(3).max(48),
});

export async function revokeTeamInvitation(formData: FormData) {
  await requireUser();
  const parsed = revokeInvitationSchema.safeParse({
    invitationId: formData.get("invitationId"),
    teamSlug: formData.get("teamSlug"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.rpc("revoke_team_invitation", {
    requested_invitation_id: parsed.data.invitationId,
  });
  revalidatePath(`/app/${parsed.data.teamSlug}`);
}
