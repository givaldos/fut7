import { describe, expect, it } from "vitest";
import { resolveDashboardDestination } from "./destination";

describe("resolveDashboardDestination", () => {
  it("sends team staff to the administrative dashboard", () => {
    expect(resolveDashboardDestination({
      hasActiveTeamMembership: true,
      hasPlayerProfile: false,
    })).toBe("/app");
  });

  it("sends player-only accounts to the player portal", () => {
    expect(resolveDashboardDestination({
      hasActiveTeamMembership: false,
      hasPlayerProfile: true,
    })).toBe("/me");
  });

  it("prioritizes administration when the same account has both personas", () => {
    expect(resolveDashboardDestination({
      hasActiveTeamMembership: true,
      hasPlayerProfile: true,
    })).toBe("/app");
  });

  it("keeps new authenticated accounts in administrative onboarding", () => {
    expect(resolveDashboardDestination({
      hasActiveTeamMembership: false,
      hasPlayerProfile: false,
    })).toBe("/app");
  });
});
