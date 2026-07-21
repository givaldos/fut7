import {
  createInvitationSchema,
  createTeamSchema,
  sanitizeTeamSlug,
  slugifyTeamName,
  updateTeamSchema,
} from "./onboarding";
import { describe, expect, it } from "vitest";

describe("onboarding validation", () => {
  it("creates a stable public slug from a Portuguese team name", () => {
    expect(slugifyTeamName("  Rachão de Quinta!  ")).toBe("rachao-de-quinta");
  });

  it("adds a readable suffix when the generated slug is too short", () => {
    expect(slugifyTeamName("FC")).toBe("fc-time");
  });

  it("sanitizes an edited slug without silently replacing an empty value", () => {
    expect(sanitizeTeamSlug("Meu_Time / 2026")).toBe("meu-time-2026");
    expect(sanitizeTeamSlug(" ")).toBe("");
  });

  it("accepts supported team formats", () => {
    expect(
      createTeamSchema.safeParse({
        name: "Racha do Bairro",
        slug: "racha-do-bairro",
        sportFormat: "society",
      }).success,
    ).toBe(true);
  });

  it("rejects unsafe or malformed public slugs", () => {
    expect(
      createTeamSchema.safeParse({
        name: "Racha do Bairro",
        slug: "../admin",
        sportFormat: "society",
      }).success,
    ).toBe(false);
  });

  it("limits administrative invitations to supported roles", () => {
    expect(
      createInvitationSchema.safeParse({
        teamId: "11111111-1111-4111-8111-111111111111",
        teamSlug: "racha-do-bairro",
        email: "admin@example.test",
        role: "manager",
      }).success,
    ).toBe(true);
    expect(
      createInvitationSchema.safeParse({
        teamId: "11111111-1111-4111-8111-111111111111",
        teamSlug: "racha-do-bairro",
        email: "admin@example.test",
        role: "owner",
      }).success,
    ).toBe(false);
  });

  it("accepts the editable team profile fields", () => {
    expect(
      updateTeamSchema.safeParse({
        teamId: "10000000-0000-4000-8000-000000000001",
        currentSlug: "racha-das-7",
        name: "Racha das 7",
        sportFormat: "society",
        timezone: "America/Sao_Paulo",
        isPublic: true,
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported team settings", () => {
    expect(
      updateTeamSchema.safeParse({
        teamId: "not-an-id",
        currentSlug: "Slug inválido",
        name: "Racha",
        sportFormat: "society",
        timezone: "UTC",
        isPublic: true,
      }).success,
    ).toBe(false);
  });
});
