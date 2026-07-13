"use server";

import { getAppUrl, getTurnstileConfig } from "@/lib/env/server";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
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

const registrationSchema = z.object({
  teamSlug: slugSchema,
  fullName: z.string().trim().min(2).max(120),
  preferredName: optionalText(60),
  birthDate: z.preprocess(
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
  ),
  phone: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s()-]/g, ""))
      .pipe(z.string().regex(/^\+[1-9][0-9]{7,14}$/))
      .optional(),
  ),
  email: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().email().max(254).optional(),
  ),
  acceptsPrivacy: z.literal(true),
  acceptsWhatsapp: z.boolean(),
  turnstileToken: z.string().max(2048).optional(),
  website: z.string().max(200),
});

export type RegistrationState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialRegistrationState: RegistrationState = {
  status: "idle",
  message: "",
};

const turnstileResponseSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
});

async function validateTurnstile(token: string | undefined) {
  const config = getTurnstileConfig();

  if (!config) {
    return process.env.NODE_ENV !== "production";
  }

  if (!token) {
    return false;
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: config.secretKey,
          response: token,
          idempotency_key: crypto.randomUUID(),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    const result = turnstileResponseSchema.safeParse(await response.json());
    const expectedHostname = getAppUrl().hostname;

    return Boolean(
      response.ok &&
        result.success &&
        result.data.success &&
        result.data.action === "athlete_registration" &&
        result.data.hostname === expectedHostname,
    );
  } catch {
    return false;
  }
}

export async function registerAthlete(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const parsed = registrationSchema.safeParse({
    teamSlug: formData.get("teamSlug"),
    fullName: formData.get("fullName"),
    preferredName: formData.get("preferredName"),
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    acceptsPrivacy: formData.get("acceptsPrivacy") === "on",
    acceptsWhatsapp: formData.get("acceptsWhatsapp") === "on",
    turnstileToken:
      formData.get("cf-turnstile-response")?.toString() || undefined,
    website: formData.get("website")?.toString() ?? "",
  });

  if (!parsed.success || (!parsed.data.phone && !parsed.data.email)) {
    return {
      status: "error",
      message: "Revise os dados. Informe pelo menos telefone ou e-mail.",
    };
  }

  // Honeypot: do not reveal detection behavior to automated submitters.
  if (parsed.data.website) {
    return {
      status: "success",
      message: "Cadastro enviado para análise do time.",
    };
  }

  if (!(await validateTurnstile(parsed.data.turnstileToken))) {
    return {
      status: "error",
      message: "Não foi possível validar a segurança. Tente novamente.",
    };
  }

  try {
    const supabase = createPrivilegedClient();
    const { error } = await supabase.rpc("submit_athlete_registration", {
      team_slug: parsed.data.teamSlug,
      full_name: parsed.data.fullName,
      preferred_name: parsed.data.preferredName ?? undefined,
      birth_date: parsed.data.birthDate ?? undefined,
      phone_e164: parsed.data.phone ?? undefined,
      email: parsed.data.email ?? undefined,
      accepts_privacy_terms: parsed.data.acceptsPrivacy,
      accepts_whatsapp: parsed.data.acceptsWhatsapp,
    });

    if (error) {
      return {
        status: "error",
        message: "Não foi possível enviar agora. Tente novamente mais tarde.",
      };
    }

    return {
      status: "success",
      message: "Cadastro enviado. O administrador do time fará a confirmação.",
    };
  } catch {
    return {
      status: "error",
      message: "O cadastro público ainda não está configurado neste ambiente.",
    };
  }
}
