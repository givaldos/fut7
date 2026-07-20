import { TEAM_SLUG_PATTERN } from "./onboarding";
import { normalizePhone } from "./phone";
import { z } from "zod";

const optionalText = (max: number, min = 2) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(min).max(max).optional(),
  );

const optionalInteger = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(minimum).max(maximum).optional(),
  );

const birthDateSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.valueOf()) &&
        date.toISOString().slice(0, 10) === value &&
        value >= "1900-01-01" &&
        date <= new Date()
      );
    })
    .optional(),
);

const phoneSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .trim()
    .transform((value, context) => {
      const normalized = normalizePhone(value);
      if (!normalized) {
        context.addIssue({ code: "custom", message: "Telefone inválido." });
        return z.NEVER;
      }
      return normalized;
    })
    .optional(),
);

export const createAthleteSchema = z.object({
  teamId: z.string().uuid(),
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  fullName: z.string().trim().min(2).max(120),
  preferredName: optionalText(60),
  shirtNumber: optionalInteger(1, 99),
  birthDate: birthDateSchema,
  phone: phoneSchema,
  email: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().toLowerCase().email().max(254).optional(),
  ),
  publicProfile: z.boolean(),
  positionCodes: z.array(z.string().regex(/^[A-Z_]{1,16}$/)).max(3).refine(
    (values) => new Set(values).size === values.length,
    "As posições não podem se repetir.",
  ),
});

export const athleteReviewSchema = z.object({
  athleteId: z.string().uuid(),
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  decision: z.enum(["approve", "reject"]),
});

export const athleteAvailabilitySchema = z.object({
  athleteId: z.string().uuid(),
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  status: z.enum(["active", "inactive"]),
});

export const createEventSchema = z.object({
  teamId: z.string().uuid(),
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  title: z.string().trim().min(2).max(120),
  kind: z.enum([
    "weekly_match",
    "championship",
    "friendly",
    "tournament",
    "training",
    "other",
  ]),
  organizationMode: z.enum(["single_squad", "split_teams"]),
  sportFormat: z.enum(["field", "society", "futsal"]),
  startsAtIso: z
    .string()
    .datetime({
      offset: true,
      error: "Informe uma data e uma hora válidas.",
    })
    .refine((value) => new Date(value).valueOf() > Date.now(), {
      message: "A data e a hora do evento precisam estar no futuro.",
    }),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  deadlineMinutes: z.coerce.number().int().min(0).max(43_200),
  repeatWeeks: z.coerce.number().int().min(1).max(52),
  opponentName: optionalText(120),
  venueName: optionalText(120),
  venueAddress: optionalText(500, 1),
});

export const updateEventSchema = createEventSchema
  .omit({ repeatWeeks: true })
  .extend({
    eventId: z.string().uuid(),
    editScope: z.enum(["single_event", "this_and_future"]),
  });

export const attendanceUpdateSchema = z.object({
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  eventId: z.string().uuid(),
  athleteId: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "declined", "maybe", "waitlist"]),
});

export const matchReportSchema = z.object({
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  eventId: z.string().uuid(),
  sideALabel: z.string().trim().min(1).max(60),
  sideBLabel: z.string().trim().min(1).max(60),
  sideAScore: z.coerce.number().int().min(0).max(99),
  sideBScore: z.coerce.number().int().min(0).max(99),
  notes: optionalText(2_000, 1),
  intent: z.enum(["save", "finalize"]),
});

export const matchIncidentSchema = z
  .object({
    teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
    eventId: z.string().uuid(),
    kind: z.enum(["goal", "yellow_card", "red_card"]),
    athleteId: z.string().uuid(),
    assistAthleteId: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.string().uuid().optional(),
    ),
    scoringSide: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce.number().int().min(1).max(2).optional(),
    ),
    minute: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce.number().int().min(1).max(300).optional(),
    ),
    notes: optionalText(200, 1),
  })
  .superRefine((incident, context) => {
    if (incident.kind === "goal" && !incident.scoringSide) {
      context.addIssue({
        code: "custom",
        path: ["scoringSide"],
        message: "Informe para qual time foi o gol.",
      });
    }
    if (
      incident.kind !== "goal" &&
      (incident.scoringSide || incident.assistAthleteId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["kind"],
        message: "Cartões não podem ter time do gol ou assistência.",
      });
    }
    if (incident.assistAthleteId === incident.athleteId) {
      context.addIssue({
        code: "custom",
        path: ["assistAthleteId"],
        message: "O autor do gol não pode dar assistência para si mesmo.",
      });
    }
  });

export const deleteMatchIncidentSchema = z.object({
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  eventId: z.string().uuid(),
  incidentId: z.string().uuid(),
});

const playerPositionsSchema = z
  .array(z.string().regex(/^[A-Z_]{1,16}$/))
  .max(3)
  .refine((values) => new Set(values).size === values.length);

export const playerProfileSchema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/),
  displayName: z.string().trim().min(2).max(100),
  preferredName: optionalText(60),
  bio: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(500).optional(),
  ),
  isPublic: z.boolean(),
  fieldPositions: playerPositionsSchema,
  societyPositions: playerPositionsSchema,
  futsalPositions: playerPositionsSchema,
});

export const playerAttendanceSchema = z.object({
  eventId: z.string().uuid(),
  status: z.enum(["confirmed", "declined", "maybe"]),
});

export const publicPlayerAttendanceSchema = playerAttendanceSchema.extend({
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
});
