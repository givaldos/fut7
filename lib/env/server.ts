import "server-only";

import { z } from "zod";
import { getPublicEnv } from "./public";

const privilegedEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20),
});

const appUrlSchema = z.string().url();

export function getPrivilegedEnv() {
  const result = privilegedEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });

  if (!result.success) {
    throw new Error("A chave secreta server-only do Supabase não foi configurada.");
  }

  return { ...getPublicEnv(), ...result.data };
}

export function getAppUrl(): URL {
  const fallback = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";
  return new URL(appUrlSchema.parse(process.env.APP_URL ?? fallback));
}

export function getTurnstileConfig() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();

  return siteKey && secretKey ? { siteKey, secretKey } : null;
}

