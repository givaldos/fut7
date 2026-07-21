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

const optionalText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
  );

const secureUrl = (hosts?: string[]) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z
      .url()
      .max(300)
      .refine((value) => {
        const parsed = new URL(value);
        return (
          parsed.protocol === "https:" &&
          !parsed.username &&
          !parsed.password &&
          (!hosts || hosts.includes(parsed.hostname.toLowerCase()))
        );
      })
      .optional(),
  );

const socialHosts = {
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com", "fb.com", "www.fb.com"],
  youtube: ["youtube.com", "www.youtube.com", "youtu.be"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
} as const;

export type TeamSocialNetwork = keyof typeof socialHosts;

export function normalizeTeamSocialUrl(
  value: FormDataEntryValue | null,
  network: TeamSocialNetwork,
) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return undefined;
  const handle = raw.replace(/^@/, "");
  const base = {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    youtube: "https://youtube.com/",
    tiktok: "https://tiktok.com/@",
  }[network];
  if (/^[a-zA-Z0-9._-]{2,80}$/.test(handle)) return `${base}${handle}`;
  return /^https:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function normalizeWebsiteUrl(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return undefined;
  return /^https:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export const updateTeamSchema = z.object({
  teamId: z.string().uuid(),
  currentSlug: z.string().regex(TEAM_SLUG_PATTERN),
  name: z.string().trim().min(2).max(100),
  sportFormat: z.enum(["field", "society", "futsal"]),
  timezone: z.literal("America/Sao_Paulo"),
  isPublic: z.boolean(),
  about: optionalText(1600),
  instagramUrl: secureUrl([...socialHosts.instagram]),
  facebookUrl: secureUrl([...socialHosts.facebook]),
  youtubeUrl: secureUrl([...socialHosts.youtube]),
  tiktokUrl: secureUrl([...socialHosts.tiktok]),
  websiteUrl: secureUrl(),
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
