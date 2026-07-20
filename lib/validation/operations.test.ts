import {
  createAthleteSchema,
  createEventSchema,
  matchIncidentSchema,
  matchReportSchema,
  updateEventSchema,
} from "./operations";
import { describe, expect, it } from "vitest";

describe("operational validation", () => {
  it("normalizes administrative athlete contact data", () => {
    const parsed = createAthleteSchema.parse({
      teamId: "11111111-1111-4111-8111-111111111111",
      teamSlug: "racha-do-bairro",
      fullName: "  Maria da Silva  ",
      preferredName: "Maria",
      shirtNumber: "10",
      birthDate: "1995-05-12",
      phone: "+55 (11) 99999-9999",
      email: "MARIA@EXAMPLE.TEST",
      publicProfile: false,
      positionCodes: ["MID", "ST"],
    });

    expect(parsed.fullName).toBe("Maria da Silva");
    expect(parsed.phone).toBe("+5511999999999");
    expect(parsed.email).toBe("maria@example.test");
    expect(parsed.shirtNumber).toBe(10);
  });

  it("rejects more than three or duplicated position preferences", () => {
    const base = {
      teamId: "11111111-1111-4111-8111-111111111111",
      teamSlug: "racha-do-bairro",
      fullName: "Maria da Silva",
      publicProfile: false,
    };

    expect(createAthleteSchema.safeParse({ ...base, positionCodes: ["MID", "MID"] }).success).toBe(false);
    expect(createAthleteSchema.safeParse({ ...base, positionCodes: ["GK", "FIXO", "MID", "ST"] }).success).toBe(false);
  });

  it("accepts one-off and bounded weekly events", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const parsed = createEventSchema.safeParse({
      teamId: "11111111-1111-4111-8111-111111111111",
      teamSlug: "racha-do-bairro",
      title: "Racha de quinta",
      kind: "weekly_match",
      organizationMode: "split_teams",
      sportFormat: "society",
      startsAtIso: future,
      durationMinutes: "90",
      deadlineMinutes: "120",
      repeatWeeks: "12",
      opponentName: "",
      venueName: "Arena Central",
      venueAddress: "Rua do Campo, 100",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.repeatWeeks).toBe(12);
  });

  it("rejects past events and excessive recurrence", () => {
    const base = {
      teamId: "11111111-1111-4111-8111-111111111111",
      teamSlug: "racha-do-bairro",
      title: "Racha",
      kind: "weekly_match",
      organizationMode: "split_teams",
      sportFormat: "society",
      durationMinutes: 90,
      deadlineMinutes: 120,
    };

    const pastEvent = createEventSchema.safeParse({
      ...base,
      startsAtIso: new Date(0).toISOString(),
      repeatWeeks: 1,
    });

    expect(pastEvent.success).toBe(false);
    if (!pastEvent.success) {
      expect(pastEvent.error.flatten().fieldErrors.startsAtIso).toContain(
        "A data e a hora do evento precisam estar no futuro.",
      );
    }
    expect(createEventSchema.safeParse({ ...base, startsAtIso: new Date(Date.now() + 86_400_000).toISOString(), repeatWeeks: 53 }).success).toBe(false);
  });

  it("accepts only the supported recurring event edit scopes", () => {
    const base = {
      teamId: "11111111-1111-4111-8111-111111111111",
      teamSlug: "racha-do-bairro",
      eventId: "22222222-2222-4222-8222-222222222222",
      title: "Racha atualizado",
      kind: "weekly_match",
      organizationMode: "split_teams",
      sportFormat: "society",
      startsAtIso: new Date(Date.now() + 86_400_000).toISOString(),
      durationMinutes: 90,
      deadlineMinutes: 120,
      editScope: "single_event",
    };

    expect(updateEventSchema.safeParse(base).success).toBe(true);
    expect(
      updateEventSchema.safeParse({ ...base, editScope: "entire_series" })
        .success,
    ).toBe(false);
  });

  it("validates match reports and optional goal assists", () => {
    const identity = {
      teamSlug: "racha-do-bairro",
      eventId: "22222222-2222-4222-8222-222222222222",
    };

    expect(
      matchReportSchema.safeParse({
        ...identity,
        sideALabel: "Verde",
        sideBLabel: "Branco",
        sideAScore: "3",
        sideBScore: "2",
        notes: "Jogo equilibrado.",
        intent: "finalize",
      }).success,
    ).toBe(true);
    expect(
      matchIncidentSchema.safeParse({
        ...identity,
        kind: "goal",
        athleteId: "33333333-3333-4333-8333-333333333333",
        assistAthleteId: "",
        scoringSide: "1",
        minute: "18",
        notes: "",
      }).success,
    ).toBe(true);
    expect(
      matchIncidentSchema.safeParse({
        ...identity,
        kind: "goal",
        athleteId: "33333333-3333-4333-8333-333333333333",
        scoringSide: "3",
      }).success,
    ).toBe(false);
  });
});
