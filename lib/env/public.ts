import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function values() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse(values());

  if (!result.success) {
    throw new Error(
      "Supabase não configurado. Copie .env.example para .env.local e preencha as chaves públicas.",
    );
  }

  return result.data;
}

export function getOptionalPublicEnv(): PublicEnv | null {
  const result = publicEnvSchema.safeParse(values());
  return result.success ? result.data : null;
}

