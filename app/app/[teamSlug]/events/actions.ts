"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  attendanceUpdateSchema,
  createEventSchema,
  deleteMatchIncidentSchema,
  matchIncidentSchema,
  matchReportSchema,
  updateEventSchema,
} from "@/lib/validation/operations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateEventState = {
  attempt?: number;
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export type MatchActionState = {
  outcome?: "success" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export async function createEvent(
  previousState: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
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
    const errors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(errors)
      .flatMap((fieldErrors) => fieldErrors ?? [])
      .find(Boolean);

    return {
      attempt,
      message:
        firstError ?? "Revise os campos indicados antes de criar o evento.",
      errors,
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
      attempt,
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

export async function updateEvent(
  previousState: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = updateEventSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    eventId: formData.get("eventId"),
    editScope: formData.get("editScope"),
    title: formData.get("title"),
    kind: formData.get("kind"),
    organizationMode: formData.get("organizationMode"),
    sportFormat: formData.get("sportFormat"),
    startsAtIso: formData.get("startsAtIso"),
    durationMinutes: formData.get("durationMinutes"),
    deadlineMinutes: formData.get("deadlineMinutes"),
    opponentName: formData.get("opponentName"),
    venueName: formData.get("venueName"),
    venueAddress: formData.get("venueAddress"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(errors)
      .flatMap((fieldErrors) => fieldErrors ?? [])
      .find(Boolean);

    return {
      attempt,
      message:
        firstError ?? "Revise os campos indicados antes de salvar o evento.",
      errors,
    };
  }

  const supabase = await createClient();
  const { data: updatedCount, error } = await supabase.rpc(
    "update_event_as_staff",
    {
      requested_team_id: parsed.data.teamId,
      requested_event_id: parsed.data.eventId,
      edit_scope: parsed.data.editScope,
      event_title: parsed.data.title,
      event_kind: parsed.data.kind,
      event_organization_mode: parsed.data.organizationMode,
      event_sport_format: parsed.data.sportFormat,
      event_starts_at: parsed.data.startsAtIso,
      event_duration_minutes: parsed.data.durationMinutes,
      attendance_deadline_minutes: parsed.data.deadlineMinutes,
      event_opponent_name: parsed.data.opponentName,
      event_venue_name: parsed.data.venueName,
      event_venue_address: parsed.data.venueAddress,
    },
  );

  if (error || !updatedCount) {
    let message =
      "Não foi possível salvar o evento. Confira sua permissão e tente novamente.";

    if (error?.code === "22023") {
      message = "A nova data precisa estar no futuro e os campos devem ser válidos.";
    } else if (error?.code === "55000") {
      message = error.message.includes("squads")
        ? "A modalidade não pode ser alterada depois que os times foram montados."
        : "Somente eventos futuros e ainda agendados podem ser editados.";
    }

    return { attempt, message };
  }

  revalidatePath(`/app/${parsed.data.teamSlug}`);
  revalidatePath(`/app/${parsed.data.teamSlug}/events`);
  revalidatePath(
    `/app/${parsed.data.teamSlug}/events/${parsed.data.eventId}`,
  );
  revalidatePath(`/t/${parsed.data.teamSlug}`);
  redirect(
    `/app/${parsed.data.teamSlug}/events/${parsed.data.eventId}?updated=${parsed.data.editScope}`,
  );
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

export async function saveMatchReport(
  _previousState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  await requireUser();
  const parsed = matchReportSchema.safeParse({
    teamSlug: formData.get("teamSlug"),
    eventId: formData.get("eventId"),
    sideALabel: formData.get("sideALabel"),
    sideBLabel: formData.get("sideBLabel"),
    sideAScore: formData.get("sideAScore"),
    sideBScore: formData.get("sideBScore"),
    notes: formData.get("notes"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      outcome: "error",
      message:
        Object.values(errors)
          .flatMap((fieldErrors) => fieldErrors ?? [])
          .find(Boolean) ?? "Revise os dados da partida.",
      errors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_match_report_as_staff", {
    requested_event_id: parsed.data.eventId,
    requested_side_a_label: parsed.data.sideALabel,
    requested_side_b_label: parsed.data.sideBLabel,
    requested_side_a_score: parsed.data.sideAScore,
    requested_side_b_score: parsed.data.sideBScore,
    requested_notes: parsed.data.notes,
    should_finalize: parsed.data.intent === "finalize",
  });

  if (error) {
    let message = "Não foi possível salvar a súmula agora.";
    if (error.code === "23514") {
      message = "O placar não pode ser menor que os gols registrados.";
    } else if (error.code === "55000") {
      message = "A partida não pode ser encerrada antes de começar.";
    } else if (error.code === "42501") {
      message = "Você não tem permissão para alterar esta súmula.";
    }
    return { outcome: "error", message };
  }

  revalidateMatchPages(parsed.data.teamSlug, parsed.data.eventId);
  return {
    outcome: "success",
    message:
      parsed.data.intent === "finalize"
        ? "Partida encerrada. As estatísticas já foram atualizadas."
        : "Súmula salva.",
  };
}

export async function addMatchIncident(
  _previousState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  await requireUser();
  const parsed = matchIncidentSchema.safeParse({
    teamSlug: formData.get("teamSlug"),
    eventId: formData.get("eventId"),
    kind: formData.get("kind"),
    athleteId: formData.get("athleteId"),
    assistAthleteId: formData.get("assistAthleteId"),
    scoringSide: formData.get("scoringSide"),
    minute: formData.get("minute"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      outcome: "error",
      message:
        Object.values(errors)
          .flatMap((fieldErrors) => fieldErrors ?? [])
          .find(Boolean) ?? "Revise o lance informado.",
      errors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_match_incident_as_staff", {
    requested_event_id: parsed.data.eventId,
    incident_kind: parsed.data.kind,
    incident_athlete_id: parsed.data.athleteId,
    incident_assist_athlete_id: parsed.data.assistAthleteId,
    incident_scoring_side: parsed.data.scoringSide,
    incident_minute: parsed.data.minute,
    incident_notes: parsed.data.notes,
  });

  if (error) {
    return {
      outcome: "error",
      message:
        error.code === "55000"
          ? "Somente atletas confirmados podem receber lances nesta partida."
          : error.code === "42501"
            ? "Você não tem permissão para registrar lances nesta partida."
            : "Não foi possível registrar o lance.",
    };
  }

  revalidateMatchPages(parsed.data.teamSlug, parsed.data.eventId);
  return { outcome: "success", message: "Lance registrado." };
}

export async function deleteMatchIncident(formData: FormData) {
  await requireUser();
  const parsed = deleteMatchIncidentSchema.safeParse({
    teamSlug: formData.get("teamSlug"),
    eventId: formData.get("eventId"),
    incidentId: formData.get("incidentId"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_match_incident_as_staff", {
    requested_incident_id: parsed.data.incidentId,
  });
  if (!error) revalidateMatchPages(parsed.data.teamSlug, parsed.data.eventId);
}

function revalidateMatchPages(teamSlug: string, eventId: string) {
  revalidatePath(`/app/${teamSlug}`);
  revalidatePath(`/app/${teamSlug}/events`);
  revalidatePath(`/app/${teamSlug}/events/${eventId}`);
  revalidatePath(`/app/${teamSlug}/events/${eventId}/match`);
  revalidatePath("/me");
  revalidatePath("/me/agenda");
  revalidatePath(`/me/agenda/${eventId}`);
  revalidatePath("/me/perfil");
}
