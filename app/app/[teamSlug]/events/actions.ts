"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  attendanceUpdateSchema,
  createEventSchema,
} from "@/lib/validation/operations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateEventState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export async function createEvent(
  _previousState: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  await requireUser();
  const parsed = createEventSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    title: formData.get("title"),
    kind: formData.get("kind"),
    organizationMode: formData.get("organizationMode"),
    sportFormat: formData.get("sportFormat"),
    startsAtIso: formData.get("startsAtIso"),
    durationMinutes: formData.get("durationMinutes"),
    deadlineMinutes: formData.get("deadlineMinutes"),
    repeatWeeks: formData.get("repeatWeeks"),
    opponentName: formData.get("opponentName"),
    venueName: formData.get("venueName"),
    venueAddress: formData.get("venueAddress"),
  });

  if (!parsed.success) {
    return {
      message: "Revise os dados do evento, incluindo a data e a hora.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: eventId, error } = await supabase.rpc("create_event_as_staff", {
    requested_team_id: parsed.data.teamId,
    event_title: parsed.data.title,
    event_kind: parsed.data.kind,
    event_organization_mode: parsed.data.organizationMode,
    event_sport_format: parsed.data.sportFormat,
    event_starts_at: parsed.data.startsAtIso,
    event_duration_minutes: parsed.data.durationMinutes,
    attendance_deadline_minutes: parsed.data.deadlineMinutes,
    repeat_weeks: parsed.data.repeatWeeks,
    event_opponent_name: parsed.data.opponentName,
    event_venue_name: parsed.data.venueName,
    event_venue_address: parsed.data.venueAddress,
  });

  if (error || !eventId) {
    return {
      message:
        error?.code === "22023"
          ? "A data deve estar no futuro e os limites do evento precisam ser válidos."
          : "Não foi possível criar o evento. Confira sua permissão e tente novamente.",
    };
  }

  revalidatePath(`/app/${parsed.data.teamSlug}`);
  revalidatePath(`/app/${parsed.data.teamSlug}/events`);
  redirect(`/app/${parsed.data.teamSlug}/events/${eventId}?created=1`);
}

export async function setEventAttendance(formData: FormData) {
  await requireUser();
  const parsed = attendanceUpdateSchema.safeParse({
    teamSlug: formData.get("teamSlug"),
    eventId: formData.get("eventId"),
    athleteId: formData.get("athleteId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_event_attendance_as_staff", {
    requested_event_id: parsed.data.eventId,
    requested_athlete_id: parsed.data.athleteId,
    next_status: parsed.data.status,
  });
  if (error) return;

  revalidatePath(`/app/${parsed.data.teamSlug}/events`);
  revalidatePath(`/app/${parsed.data.teamSlug}/events/${parsed.data.eventId}`);
}

