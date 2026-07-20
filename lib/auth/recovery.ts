import "server-only";

export const PASSWORD_RECOVERY_COOKIE = "fut7-password-recovery";
export const PASSWORD_RECOVERY_MAX_AGE_SECONDS = 10 * 60;

export function passwordRecoveryCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/auth",
    maxAge: PASSWORD_RECOVERY_MAX_AGE_SECONDS,
  };
}
