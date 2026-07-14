"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { invitationResponseSchema } from "@/lib/validation/onboarding";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function respond(formData: FormData, response: "accept" | "decline") {
  await requireUser();
  const parsed = invitationResponseSchema.safeParse({
    invitationId: formData.get("invitationId"),
    response,
  });
  if (!parsed.success) redirect("/app?invite=unavailable");

  const supabase = await createClient();
  const { data: teamSlug, error } = await supabase.rpc(
    "respond_to_team_invitation",
    {
      requested_invitation_id: parsed.data.invitationId,
      invitation_response: parsed.data.response,
    },
  );

  if (error) redirect("/app?invite=unavailable");

  revalidatePath("/app");
  if (response === "accept" && teamSlug) redirect(`/app/${teamSlug}`);
  redirect("/app");
}

export async function acceptTeamInvitation(formData: FormData) {
  return respond(formData, "accept");
}

export async function declineTeamInvitation(formData: FormData) {
  return respond(formData, "decline");
}
