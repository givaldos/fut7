import { z } from "zod";

export const recoveredPasswordSchema = z
  .object({
    password: z.string().min(12).max(128),
    repeatPassword: z.string().min(12).max(128),
  })
  .refine((value) => value.password === value.repeatPassword, {
    message: "As senhas não coincidem.",
    path: ["repeatPassword"],
  });
