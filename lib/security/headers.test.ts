import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "./headers";

describe("content security policy", () => {
  it("allows the runtime helpers required by Next.js only in development", () => {
    const policy = buildContentSecurityPolicy("development-nonce", true);

    expect(policy).toContain("script-src 'self' 'nonce-development-nonce' 'strict-dynamic' 'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("style-src 'self' 'nonce-development-nonce'");
    expect(policy).toContain(
      "img-src 'self' blob: data: https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321",
    );
    expect(policy).toContain(
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com http://127.0.0.1:54321 ws://127.0.0.1:54321 http://localhost:54321 ws://localhost:54321",
    );
  });

  it("keeps scripts and styles nonce-restricted in production", () => {
    const policy = buildContentSecurityPolicy("production-nonce", false);

    expect(policy).toContain("script-src 'self' 'nonce-production-nonce' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-production-nonce'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("http://127.0.0.1:54321");
    expect(policy).not.toContain("http://localhost:54321");
  });
});
