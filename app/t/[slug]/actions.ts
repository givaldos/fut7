"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { publicPlayerAttendanceSchema } from "@/lib/validation/operations";
import { revalidatePath } from "next/cache";

export type PublicAttendanceState = {
  outcome?: "success" | "error";
  message?: string;
  status?: "confirmed" | "declined" | "maybe";
};

export async function respondToPublicEvent(
  _previousState: PublicAttendanceState,
  formData: FormData,
): Promise<PublicAttendanceState> {
  await requireUser();
  const parsed = publicPlayerAttendanceSchema.safeParse({
    teamSlug: formData.get("teamSlug"),
    eventId: formData.get("eventId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { outcome: "error", message: "Resposta inválida. Atualize a página e tente novamente." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_event_as_player", {
    requested_event_id: parsed.data.eventId,
    response_status: parsed.data.status,
  });

  if (error) {
    return {
      outcome: "error",
      message:
        error.code === "42501" || error.code === "55000"
          ? "Esta chamada não está disponível para o seu vínculo. Confira a aprovação e o prazo."
          : "Não foi possível confirmar agora. Tente novamente.",
    };
  }

  revalidatePath(`/t/${parsed.data.teamSlug}`);
  revalidatePath("/me");
  return {
    outcome: "success",
    message: "Presença atualizada.",
    status: parsed.data.status,
  };
}
