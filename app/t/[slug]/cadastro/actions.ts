"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/validation/phone";
import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(48)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(2).max(max).optional(),
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

const registrationSchema = z.object({
  teamSlug: slugSchema,
  fullName: z.string().trim().min(2).max(100),
  preferredName: optionalText(60),
  birthDate: birthDateSchema,
  phone: z.string().trim().max(24).optional(),
  acceptsPrivacy: z.literal(true),
  acceptsWhatsapp: z.boolean(),
  positionCodes: z
    .array(z.string().regex(/^[A-Z_]{1,16}$/))
    .max(3)
    .refine((items) => new Set(items).size === items.length),
  website: z.string().max(200),
  turnstileToken: z.string().max(2048).optional(),
});

export type RegistrationActionResult =
  | { ok: true; phone: string }
  | { ok: false; message: string };

function readRegistration(formData: FormData) {
  return registrationSchema.safeParse({
    teamSlug: formData.get("teamSlug"),
    fullName: formData.get("fullName"),
    preferredName: formData.get("preferredName"),
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
    acceptsPrivacy: formData.get("acceptsPrivacy") === "on",
    acceptsWhatsapp: formData.get("acceptsWhatsapp") === "on",
    positionCodes: formData.getAll("positionCodes"),
    website: formData.get("website")?.toString() ?? "",
    turnstileToken:
      formData.get("cf-turnstile-response")?.toString() || undefined,
  });
}

export async function prepareAthleteRegistration(
  formData: FormData,
): Promise<RegistrationActionResult> {
  const parsed = readRegistration(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise os campos obrigatórios e escolha no máximo 3 posições.",
    };
  }

  const phone = normalizePhone(parsed.data.phone ?? "");
  if (!phone) {
    return {
      ok: false,
      message: "Informe um WhatsApp válido. O +55 é adicionado automaticamente.",
    };
  }

  // Honeypot: never proceed to an OTP request for automated submissions.
  if (parsed.data.website) {
    return { ok: false, message: "Não foi possível concluir agora." };
  }

  if (process.env.NODE_ENV === "production" && !parsed.data.turnstileToken) {
    return {
      ok: false,
      message: "Conclua a verificação de segurança para continuar.",
    };
  }

  return { ok: true, phone };
}

export async function completeAthleteRegistration(
  formData: FormData,
): Promise<RegistrationActionResult> {
  const parsed = readRegistration(formData);
  if (!parsed.success || parsed.data.website) {
    return { ok: false, message: "Revise os dados do cadastro." };
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims?.claims?.sub) {
    return {
      ok: false,
      message: "Confirme o código recebido no WhatsApp antes de concluir.",
    };
  }

  const { error } = await supabase.rpc("complete_verified_athlete_registration", {
    team_slug: parsed.data.teamSlug,
    full_name: parsed.data.fullName,
    preferred_name: parsed.data.preferredName ?? "",
    birth_date: parsed.data.birthDate ?? "",
    accepts_privacy_terms: parsed.data.acceptsPrivacy,
    accepts_whatsapp: parsed.data.acceptsWhatsapp,
    position_codes: parsed.data.positionCodes,
  });

  if (error) {
    return {
      ok: false,
      message:
        error.code === "42501"
          ? "O WhatsApp desta sessão ainda não foi confirmado. Solicite um novo código."
          : "Não foi possível enviar o cadastro ao time. Tente novamente.",
    };
  }

  return { ok: true, phone: parsed.data.phone ?? "" };
}
