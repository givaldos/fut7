export type DashboardDestination = "/app" | "/me";

export function resolveDashboardDestination({
  hasActiveTeamMembership,
  hasPlayerProfile,
}: {
  hasActiveTeamMembership: boolean;
  hasPlayerProfile: boolean;
}): DashboardDestination {
  if (hasActiveTeamMembership) return "/app";
  if (hasPlayerProfile) return "/me";

  // Authenticated administrator accounts without a team still need the PLG
  // onboarding and invitation inbox available at /app.
  return "/app";
}
