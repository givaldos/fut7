import { TEAM_SLUG_PATTERN } from "./onboarding";
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
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(/^\+[1-9][0-9]{7,14}$/))
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
    .datetime({ offset: true })
    .refine((value) => new Date(value).valueOf() >= Date.now() - 5 * 60 * 1000),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  deadlineMinutes: z.coerce.number().int().min(0).max(43_200),
  repeatWeeks: z.coerce.number().int().min(1).max(52),
  opponentName: optionalText(120),
  venueName: optionalText(120),
  venueAddress: optionalText(500, 1),
});

export const attendanceUpdateSchema = z.object({
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  eventId: z.string().uuid(),
  athleteId: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "declined", "maybe", "waitlist"]),
});

