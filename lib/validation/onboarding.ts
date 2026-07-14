import { z } from "zod";

export const TEAM_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

export function sanitizeTeamSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

export function slugifyTeamName(value: string) {
  const slug = sanitizeTeamSlug(value);

  if (slug.length >= 3) return slug;
  return slug ? `${slug}-time`.slice(0, 48) : "meu-time";
}

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(48)
    .regex(TEAM_SLUG_PATTERN),
  sportFormat: z.enum(["field", "society", "futsal"]),
});

export const createInvitationSchema = z.object({
  teamId: z.string().uuid(),
  teamSlug: z.string().regex(TEAM_SLUG_PATTERN),
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(["admin", "manager"]),
});

export const invitationResponseSchema = z.object({
  invitationId: z.string().uuid(),
  response: z.enum(["accept", "decline"]),
});
