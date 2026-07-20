import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
} from "@/lib/security/headers";
import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = applySecurityHeaders(
    await updateSession(request, requestHeaders),
    contentSecurityPolicy,
  );

  // Confirmation tokens are URL capabilities. Do not propagate their URL in
  // the Referer header when the user explicitly submits the confirmation form.
  if (
    request.nextUrl.pathname === "/auth/confirm" ||
    request.nextUrl.pathname === "/auth/recovery" ||
    request.nextUrl.pathname === "/auth/update-password" ||
    request.nextUrl.pathname.startsWith("/invite/")
  ) {
    response.headers.set("Referrer-Policy", "no-referrer");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
