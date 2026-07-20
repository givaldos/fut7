import { describe, expect, it } from "vitest";
import { recoveredPasswordSchema } from "./auth";

describe("recoveredPasswordSchema", () => {
  it("accepts matching passwords with at least 12 characters", () => {
    expect(recoveredPasswordSchema.safeParse({
      password: "uma-senha-segura-2026",
      repeatPassword: "uma-senha-segura-2026",
    }).success).toBe(true);
  });

  it("rejects short or mismatched passwords", () => {
    expect(recoveredPasswordSchema.safeParse({ password: "curta", repeatPassword: "curta" }).success).toBe(false);
    expect(recoveredPasswordSchema.safeParse({
      password: "uma-senha-segura-2026",
      repeatPassword: "outra-senha-segura-2026",
    }).success).toBe(false);
  });
});
